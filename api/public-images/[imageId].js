import { createPublicImageHandler } from "../../server/public-image-gateway.js";

const handler = createPublicImageHandler();

export default {
    async fetch(request) {
        return handler(request);
    },
};
