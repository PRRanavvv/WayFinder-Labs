import { denseVectorFromText } from "./textUtils.js";

export const localHashEmbeddingConfig = {
  provider: "local-hash",
  model: "public-demo-hash-embedding-v1",
  dimensions: 64,
  queryPrefix: ""
};

export const bgeSmallEmbeddingConfig = {
  provider: "transformers-js",
  model: "Xenova/bge-small-en-v1.5",
  dimensions: 384,
  queryPrefix: "Represent this sentence for searching relevant passages: "
};

export const defaultEmbeddingConfig = resolveDefaultEmbeddingConfig();

export function createEmbeddingService(config = {}) {
  const requestedProvider = config.provider || defaultEmbeddingConfig.provider;
  const providerDefaults = requestedProvider === "transformers-js"
    ? bgeSmallEmbeddingConfig
    : localHashEmbeddingConfig;
  const resolvedConfig = {
    ...providerDefaults,
    provider: requestedProvider,
    ...config
  };

  if (resolvedConfig.provider === "local-hash") {
    return createLocalHashEmbeddingService(resolvedConfig);
  }

  if (resolvedConfig.provider === "transformers-js") {
    return createTransformersEmbeddingService(resolvedConfig);
  }

  throw new Error(
    `Embedding provider "${resolvedConfig.provider}" is not supported. Use "local-hash" or "transformers-js".`
  );
}

function resolveDefaultEmbeddingConfig() {
  const provider = process.env.WAYFINDER_EMBEDDING_PROVIDER || localHashEmbeddingConfig.provider;
  const providerDefaults = provider === "transformers-js"
    ? bgeSmallEmbeddingConfig
    : localHashEmbeddingConfig;

  return {
    ...providerDefaults,
    provider,
    model: process.env.WAYFINDER_EMBEDDING_MODEL || providerDefaults.model,
    dimensions: Number(process.env.WAYFINDER_EMBEDDING_DIMENSIONS || providerDefaults.dimensions)
  };
}

export function createBgeSmallEmbeddingService(config = {}) {
  return createEmbeddingService({
    ...bgeSmallEmbeddingConfig,
    ...config
  });
}

function createLocalHashEmbeddingService(resolvedConfig) {
  return {
    config: resolvedConfig,
    async embedText(text) {
      return denseVectorFromText(text, { dimensions: resolvedConfig.dimensions });
    },
    async embedChunks(chunks) {
      return Promise.all(
        chunks.map(async (chunk) => ({
          ...chunk,
          embedding: await denseVectorFromText(chunk.text, {
            dimensions: resolvedConfig.dimensions
          }),
          embeddingModel: resolvedConfig.model,
          embeddingDimensions: resolvedConfig.dimensions,
          embeddingUpdatedAt: new Date().toISOString()
        }))
      );
    }
  };
}

function createTransformersEmbeddingService(resolvedConfig) {
  let extractorPromise;

  async function getExtractor() {
    if (!extractorPromise) {
      extractorPromise = import("@huggingface/transformers")
        .then(({ pipeline }) => pipeline("feature-extraction", resolvedConfig.model));
    }

    try {
      return await extractorPromise;
    } catch (error) {
      throw new Error(
        `Unable to load Transformers.js embedding model "${resolvedConfig.model}". Install @huggingface/transformers and ensure model weights are available. Original error: ${error.message}`
      );
    }
  }

  async function embedMany(texts, { inputType = "document" } = {}) {
    const extractor = await getExtractor();
    const preparedTexts = texts.map((text) => prepareEmbeddingText(text, {
      inputType,
      queryPrefix: resolvedConfig.queryPrefix
    }));
    const output = await extractor(preparedTexts, { pooling: "mean", normalize: true });
    return tensorToVectors(output, resolvedConfig.dimensions);
  }

  return {
    config: resolvedConfig,
    async embedText(text, options = {}) {
      const [embedding] = await embedMany([text], options);
      return embedding;
    },
    async embedChunks(chunks) {
      const embeddings = await embedMany(chunks.map((chunk) => chunk.text), {
        inputType: "document"
      });

      return chunks.map((chunk, index) => ({
        ...chunk,
        embedding: embeddings[index],
        embeddingModel: resolvedConfig.model,
        embeddingDimensions: resolvedConfig.dimensions,
        embeddingUpdatedAt: new Date().toISOString()
      }));
    }
  };
}

function prepareEmbeddingText(text, { inputType, queryPrefix }) {
  if (inputType !== "query" || !queryPrefix) return text;
  if (String(text).startsWith(queryPrefix)) return text;
  return `${queryPrefix}${text}`;
}

function tensorToVectors(tensor, dimensions) {
  const nested = typeof tensor.tolist === "function" ? tensor.tolist() : null;

  if (nested) {
    const vectors = Array.isArray(nested[0]) ? nested : [nested];
    return vectors.map((vector) => Array.from(vector, Number));
  }

  if (!tensor?.data) {
    throw new Error("Transformers.js embedding output did not include tensor data.");
  }

  const data = Array.from(tensor.data, Number);
  const rowCount = Math.max(1, Math.floor(data.length / dimensions));
  const vectors = [];

  for (let row = 0; row < rowCount; row += 1) {
    vectors.push(data.slice(row * dimensions, (row + 1) * dimensions));
  }

  return vectors;
}
