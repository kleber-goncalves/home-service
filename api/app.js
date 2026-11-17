import { createAppHandler } from "../server/app-gateway.js";

const handler = createAppHandler();

export default {
    async fetch(request) {
        return handler(request);
    },
};
