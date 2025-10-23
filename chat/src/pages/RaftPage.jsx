import React, { useEffect, useRef } from "react";
import { Link } from "react-router-dom";

export default function RaftPage() {
  const containerRef = useRef(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const container = containerRef.current;

    // Add raft-specific styles
    const style = document.createElement("style");
    style.textContent = `
      * {
        margin: 0;
        padding: 0;
        box-sizing: border-box;
      }

      .raft-container {
        font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
        background: #1a1a2e;
        color: #eee;
        overflow: hidden;
      }

      #raft-app {
        display: flex;
        height: 100vh;
      }

      /* Sidebar */
      .sidebar {
        width: 350px;
        background: #16213e;
        border-right: 2px solid #0f3460;
        display: flex;
        flex-direction: column;
        overflow-y: auto;
      }

      .sidebar-section {
        padding: 20px;
        border-bottom: 1px solid #0f3460;
      }

      .sidebar-section h2 {
        font-size: 16px;
        margin-bottom: 15px;
        color: #00d4ff;
        text-transform: uppercase;
        letter-spacing: 1px;
      }

      .form-group {
        margin-bottom: 15px;
      }

      .form-group label {
        display: block;
        font-size: 12px;
        margin-bottom: 5px;
        color: #aaa;
      }

      .form-group input,
      .form-group select {
        width: 100%;
        padding: 8px;
        background: #0f3460;
        border: 1px solid #00d4ff;
        color: #fff;
        border-radius: 4px;
        font-size: 14px;
      }

      .form-row {
        display: flex;
        gap: 10px;
      }

      .form-row .form-group {
        flex: 1;
      }

      .control-btn {
        width: 100%;
        padding: 12px;
        margin-bottom: 10px;
        background: #0f3460;
        border: 2px solid #00d4ff;
        color: #00d4ff;
        border-radius: 4px;
        cursor: pointer;
        font-size: 14px;
        font-weight: 600;
        transition: all 0.2s;
      }

      .control-btn:hover {
        background: #00d4ff;
        color: #16213e;
      }

      .control-btn.success {
        border-color: #4CAF50;
        color: #4CAF50;
      }

      .control-btn.success:hover {
        background: #4CAF50;
        color: #fff;
      }

      .control-btn.danger {
        border-color: #ff4757;
        color: #ff4757;
      }

      .control-btn.danger:hover {
        background: #ff4757;
        color: #fff;
      }

      .participant-list, .message-list {
        max-height: 200px;
        overflow-y: auto;
        background: #0f3460;
        border-radius: 4px;
        padding: 10px;
      }

      .participant-item, .message-item {
        padding: 8px;
        margin-bottom: 5px;
        background: #1a1a2e;
        border-radius: 4px;
        display: flex;
        justify-content: space-between;
        align-items: center;
        font-size: 12px;
      }

      .participant-color {
        width: 20px;
        height: 20px;
        border-radius: 4px;
        display: inline-block;
        margin-right: 8px;
      }

      .btn-remove {
        background: #ff4757;
        border: none;
        color: #fff;
        padding: 4px 8px;
        border-radius: 3px;
        cursor: pointer;
        font-size: 11px;
      }

      .slider-control label {
        display: block;
        font-size: 12px;
        margin-bottom: 5px;
        color: #aaa;
      }

      .slider-value {
        float: right;
        color: #00d4ff;
        font-weight: 600;
      }

      /* Main Canvas Area */
      .canvas-area {
        flex: 1;
        position: relative;
        display: flex;
        flex-direction: column;
      }

      #timeline-canvas {
        flex: 1;
        background: #1a1a2e;
      }

      /* Timeline Controls */
      .timeline-bar {
        background: #16213e;
        border-top: 2px solid #0f3460;
        padding: 15px 20px;
      }

      .timeline-controls {
        display: flex;
        align-items: center;
        gap: 15px;
        margin-bottom: 10px;
      }

      .timeline-controls button {
        padding: 8px 16px;
        background: #0f3460;
        border: 2px solid #00d4ff;
        color: #00d4ff;
        border-radius: 4px;
        cursor: pointer;
        font-weight: 600;
      }

      .timeline-controls button:hover {
        background: #00d4ff;
        color: #16213e;
      }

      .timeline-scrubber {
        width: 100%;
      }

      .timeline-info {
        display: flex;
        justify-content: space-between;
        font-size: 12px;
        margin-top: 5px;
        color: #aaa;
      }

      .time-display {
        color: #00d4ff;
        font-weight: 600;
        font-family: 'Courier New', monospace;
      }
    `;
    document.head.appendChild(style);

    container.innerHTML = `
      <div id="raft-app" class="raft-container">
        <!-- Sidebar Controls -->
        <div class="sidebar">
          <div class="sidebar-section">
            <h2>Add Participant</h2>
            <div class="form-group">
              <label>Name</label>
              <input type="text" id="participant-name" placeholder="Server1" />
            </div>
            <div class="form-row">
              <div class="form-group">
                <label>Shape</label>
                <select id="participant-shape">
                  <option value="circle">Circle</option>
                  <option value="square">Square</option>
                  <option value="triangle">Triangle</option>
                  <option value="hexagon">Hexagon</option>
                </select>
              </div>
              <div class="form-group">
                <label>Color</label>
                <input type="color" id="participant-color" value="#4CAF50" />
              </div>
            </div>
            <button class="control-btn success" id="btn-add-participant">Add Participant</button>

            <h2 style="margin-top: 20px;">Participants</h2>
            <div class="participant-list" id="participant-list">
              <div style="text-align: center; color: #777;">No participants yet</div>
            </div>
          </div>

          <div class="sidebar-section">
            <h2>Add Message</h2>
            <div class="form-row">
              <div class="form-group">
                <label>From</label>
                <select id="message-from">
                  <option value="">Select...</option>
                </select>
              </div>
              <div class="form-group">
                <label>To</label>
                <select id="message-to">
                  <option value="">Select...</option>
                </select>
              </div>
            </div>
            <div class="form-group">
              <label>Message Text</label>
              <input type="text" id="message-text" placeholder="Hello!" />
            </div>
            <div class="form-row">
              <div class="form-group">
                <label>Timestamp (ms)</label>
                <input type="number" id="message-timestamp" value="0" min="0" step="100" />
              </div>
              <div class="form-group">
                <label>Duration (ms)</label>
                <input type="number" id="message-duration" value="1000" min="100" step="100" />
              </div>
            </div>
            <div class="form-group">
              <label>Color (optional)</label>
              <input type="color" id="message-color" value="#00d4ff" />
            </div>
            <button class="control-btn success" id="btn-add-message">Add Message</button>

            <h2 style="margin-top: 20px;">Messages (<span id="message-count">0</span>)</h2>
            <div class="message-list" id="message-list">
              <div style="text-align: center; color: #777;">No messages yet</div>
            </div>
          </div>

          <div class="sidebar-section">
            <h2>Controls</h2>
            <div class="slider-control">
              <label>
                Playback Speed
                <span class="slider-value" id="speed-value">1.0x</span>
              </label>
              <input type="range" id="speed-slider" min="0.25" max="4" step="0.25" value="1.0">
            </div>
            <div class="slider-control" style="margin-top: 15px;">
              <label>
                Circle Radius
                <span class="slider-value" id="radius-value">250px</span>
              </label>
              <input type="range" id="radius-slider" min="100" max="400" step="10" value="250">
            </div>
          </div>

          <div class="sidebar-section">
            <h2>Data</h2>
            <button class="control-btn" id="btn-lucky" style="border-color: #FFD700; color: #FFD700; margin-bottom: 20px;">🎲 I'm Feeling Lucky</button>
            <button class="control-btn" id="btn-export">Export JSON</button>
            <button class="control-btn" id="btn-import">Import JSON</button>
            <button class="control-btn danger" id="btn-clear">Clear All</button>
          </div>
        </div>

        <!-- Main Canvas -->
        <div class="canvas-area">
          <canvas id="timeline-canvas"></canvas>

          <!-- Timeline Controls -->
          <div class="timeline-bar">
            <div class="timeline-controls">
              <button id="btn-play">▶ Play</button>
              <button id="btn-pause">⏸ Pause</button>
              <button id="btn-reset">⏮ Reset</button>
            </div>
            <input type="range" id="timeline-scrubber" class="timeline-scrubber" min="0" max="10000" value="0" step="10">
            <div class="timeline-info">
              <span>Time: <span class="time-display" id="current-time">0.0s</span></span>
              <span>Duration: <span class="time-display" id="total-time">0.0s</span></span>
            </div>
          </div>
        </div>
      </div>
    `;

    import("../demos/raft/main.ts");

    return () => {
      container.innerHTML = "";
      document.head.removeChild(style);
    };
  }, []);

  return (
    <div className="relative h-screen">
      <Link
        to="/"
        className="absolute top-4 left-4 z-50 px-4 py-2 bg-zinc-700 text-white border border-zinc-600 rounded-md shadow-sm hover:bg-zinc-600"
      >
        ← Back
      </Link>
      <div ref={containerRef} className="h-full" />
    </div>
  );
}
