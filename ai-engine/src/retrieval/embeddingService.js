import { denseVectorFromText } from "./textUtils.js";

export const defaultEmbeddingConfig = {
  provider: "local-hash",
  model: "public-demo-hash-embedding-v1",
  dimensions: 64
};

export function createEmbeddingService(config = {}) {
  const resolvedConfig = {
    ...defaultEmbeddingConfig,
    ...config
  };

  if (resolvedConfig.provider !== "local-hash") {
    throw new Error(
      `Embedding provider "${resolvedConfig.provider}" is not available in the public demo. Configure a private provider in production.`
    );
  }

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
