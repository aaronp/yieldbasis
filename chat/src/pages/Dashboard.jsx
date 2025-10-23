import React from "react";
import { Link } from "react-router-dom";

export default function Dashboard() {
  const demos = [
    {
      name: "Chat",
      path: "/chat",
      description: "Animated chat with graph visualization",
      color: "bg-blue-500",
    },
    {
      name: "D3 Graph",
      path: "/d3",
      description: "D3.js force-directed, hierarchy, and radial layouts",
      color: "bg-green-500",
    },
    {
      name: "SVG Graph",
      path: "/svg",
      description: "Vanilla SVG graph with draggable nodes",
      color: "bg-purple-500",
    },
    {
      name: "Raft Timeline",
      path: "/raft",
      description: "Distributed systems message timeline",
      color: "bg-orange-500",
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center p-8">
      <div className="max-w-5xl w-full">
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold text-white mb-4">Graph Demos</h1>
          <p className="text-gray-400 text-lg">
            Explore different graph visualization techniques
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {demos.map((demo) => (
            <Link
              key={demo.path}
              to={demo.path}
              className="group relative overflow-hidden rounded-xl bg-gray-800 border border-gray-700 hover:border-gray-600 transition-all duration-300 hover:shadow-2xl hover:scale-105"
            >
              <div className="p-8">
                <div
                  className={`w-12 h-12 ${demo.color} rounded-lg mb-4 group-hover:scale-110 transition-transform duration-300`}
                />
                <h2 className="text-2xl font-bold text-white mb-2 group-hover:text-blue-400 transition-colors">
                  {demo.name}
                </h2>
                <p className="text-gray-400">{demo.description}</p>
              </div>
              <div className="absolute inset-0 bg-gradient-to-br from-blue-500/0 to-purple-500/0 group-hover:from-blue-500/10 group-hover:to-purple-500/10 transition-all duration-300" />
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
