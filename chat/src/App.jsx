import React from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Dashboard from "./pages/Dashboard";
import ChatPage from "./pages/ChatPage";
import D3Page from "./pages/D3Page";
import SVGPage from "./pages/SVGPage";
import RaftPage from "./pages/RaftPage";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/chat" element={<ChatPage />} />
        <Route path="/d3" element={<D3Page />} />
        <Route path="/svg" element={<SVGPage />} />
        <Route path="/raft" element={<RaftPage />} />
      </Routes>
    </BrowserRouter>
  );
}
