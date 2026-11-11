import HomePage from "@/pages/HomePage";
import Poc01Page from "@/pages/Poc01Page";

export default function App() {
    const isPoc01 = new URLSearchParams(window.location.search).get("poc") === "01";

    return isPoc01 ? <Poc01Page /> : <HomePage />;
}
