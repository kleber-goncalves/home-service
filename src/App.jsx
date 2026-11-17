import AuthDemoPage from "@/pages/AuthDemoPage";
import HomePage from "@/pages/HomePage";
import Poc01Page from "@/pages/Poc01Page";

export default function App() {
    const params = new URLSearchParams(window.location.search);
    const isPoc01 = params.get("poc") === "01";
    const isAuthDemo = params.get("auth") === "demo";

    if (isPoc01) return <Poc01Page />;
    if (isAuthDemo) return <AuthDemoPage initialMode={params.get("mode")} />;

    return <HomePage />;
}
