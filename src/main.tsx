import React from "react";
import { createRoot } from "react-dom/client";
import Home from "./pages/home";
import Message from "./pages/message";
import Games from "./pages/games";

const AppRouter: React.FC = () => {
	const pathname = window.location.pathname || "/";

	// Minimal router: render Home at `/`, Message at `/message`, Games at `/games`.
	if (pathname === "/") return <Home />;
	if (pathname === "/message" || pathname === "/messages") return <Message />;
	if (pathname === "/games" || pathname === "/game") return <Games />;

	// fallback to Home
	return <Home />;
};

const container = document.getElementById("root");
if (container) {
	const root = createRoot(container);
	root.render(
		<React.StrictMode>
			<AppRouter />
		</React.StrictMode>
	);
}
