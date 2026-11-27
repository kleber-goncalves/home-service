import { createManagedImageHandler } from "../server/managed-image-gateway.js";

const handler = createManagedImageHandler();

export default {
    async fetch(request) {
        return handler(request);
    },
};
