import { createImageUploadHandler } from "../server/image-upload-gateway.js";

const handler = createImageUploadHandler();

export default {
    async fetch(request) {
        return handler(request);
    },
};
