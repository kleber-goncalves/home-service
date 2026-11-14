import { createPoc04SessionHandler } from "../../server/poc04-session-gateway.js";

const handler = createPoc04SessionHandler();

export default {
    async fetch(request) {
        return handler(request);
    },
};
