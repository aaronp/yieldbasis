import React, { useState, useEffect } from 'react';
import { Chat } from '../model';

/**
 * Example component demonstrating Chat API usage
 * Shows best practices for using the services layer
 */
export default function ChatAPIExample() {
  const [chat, setChat] = useState(null);
  const [users, setUsers] = useState([]);
  const [groups, setGroups] = useState([]);
  const [messages, setMessages] = useState([]);
  const [selectedGroup, setSelectedGroup] = useState(null);

  // Initialize chat service with persistent storage
  useEffect(() => {
    const initChat = async () => {
      // Use factory method to create service with IndexedDB
      const service = await Chat.createPersistent();
      setChat(service);

      // Load initial data
      loadData(service);
    };

    initChat();
  }, []);

  const loadData = (service) => {
    setUsers(service.users.getAll());
    setGroups(service.getGroupsWithUsers());

    if (selectedGroup) {
      const msgs = service.getMessagesWithUsers(selectedGroup);
      setMessages(msgs);
    }
  };

  const handleCreateUser = () => {
    if (!chat) return;

    const user = chat.users.create({
      name: `User ${users.length + 1}`,
      avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${Date.now()}`,
      data: { status: 'online' }
    });

    setUsers([...users, user]);
  };

  const handleCreateGroup = () => {
    if (!chat || users.length === 0) return;

    const group = chat.groups.create({
      name: `Group ${groups.length + 1}`,
      userIds: users.slice(0, 2).map(u => u.id)
    });

    setGroups([...groups, group]);
  };

  const handleSendMessage = (text) => {
    if (!chat || !selectedGroup || users.length === 0) return;

    const randomUser = users[Math.floor(Math.random() * users.length)];

    chat.messages.create({
      text,
      userId: randomUser.id,
      groupId: selectedGroup
    });

    loadData(chat);
  };

  const handleLoadSampleData = async () => {
    if (!chat) return;

    // Create sample users
    const alice = chat.users.create({
      name: 'Alice',
      data: { role: 'Developer' }
    });

    const bob = chat.users.create({
      name: 'Bob',
      data: { role: 'Designer' }
    });

    const carol = chat.users.create({
      name: 'Carol',
      data: { role: 'Manager' }
    });

    // Create group
    const team = chat.groups.create({
      name: 'Team Chat',
      userIds: [alice.id, bob.id, carol.id]
    });

    // Create messages
    chat.messages.create({
      text: 'Hey team!',
      userId: alice.id,
      groupId: team.id,
      timestamp: Date.now() - 3000
    });

    chat.messages.create({
      text: 'Hi Alice!',
      userId: bob.id,
      groupId: team.id,
      timestamp: Date.now() - 2000
    });

    chat.messages.create({
      text: 'Good morning everyone',
      userId: carol.id,
      groupId: team.id,
      timestamp: Date.now() - 1000
    });

    // Create layout settings
    chat.layout.create({
      type: 'user',
      ordering: [alice.id, bob.id, carol.id]
    });

    loadData(chat);
    setSelectedGroup(team.id);
  };

  const handleExport = () => {
    if (!chat) return;

    const data = chat.exportAll();
    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: 'application/json'
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `chat-data-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = () => {
    if (!chat) return;

    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'application/json';
    input.onchange = (e) => {
      const file = e.target.files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = async (event) => {
        try {
          const data = JSON.parse(event.target.result);
          await chat.importAll(data);
          loadData(chat);
          alert('Data imported successfully!');
        } catch (error) {
          alert(`Failed to import: ${error.message}`);
        }
      };
      reader.readAsText(file);
    };
    input.click();
  };

  if (!chat) {
    return (
      <div className="flex items-center justify-center h-screen bg-zinc-950">
        <div className="text-white">Loading Chat API...</div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-zinc-950 flex flex-col">
      <div className="bg-zinc-900 border-b border-zinc-800 p-4">
        <h1 className="text-2xl font-bold text-white mb-2">Chat API Example</h1>
        <p className="text-sm text-zinc-400">
          Demonstrates Chat service with Users, Groups, Messages, and Layout
        </p>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar */}
        <div className="w-80 bg-zinc-900 border-r border-zinc-800 p-4 overflow-y-auto">
          <div className="mb-6">
            <h2 className="text-sm font-semibold text-zinc-300 mb-3">Quick Actions</h2>
            <div className="space-y-2">
              <button
                onClick={handleLoadSampleData}
                className="w-full px-3 py-2 bg-cyan-600 text-white rounded-md hover:bg-cyan-700 text-sm"
              >
                Load Sample Data
              </button>
              <button
                onClick={handleCreateUser}
                className="w-full px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm"
              >
                Create User
              </button>
              <button
                onClick={handleCreateGroup}
                className="w-full px-3 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 text-sm"
                disabled={users.length === 0}
              >
                Create Group
              </button>
              <button
                onClick={handleExport}
                className="w-full px-3 py-2 bg-zinc-700 text-white rounded-md hover:bg-zinc-600 text-sm"
              >
                Export Data
              </button>
              <button
                onClick={handleImport}
                className="w-full px-3 py-2 bg-zinc-700 text-white rounded-md hover:bg-zinc-600 text-sm"
              >
                Import Data
              </button>
            </div>
          </div>

          <div className="mb-6">
            <h2 className="text-sm font-semibold text-zinc-300 mb-3">
              Users ({users.length})
            </h2>
            <div className="space-y-2">
              {users.map((user) => (
                <div
                  key={user.id}
                  className="p-2 bg-zinc-800 rounded-md text-sm text-white"
                >
                  {user.name}
                </div>
              ))}
            </div>
          </div>

          <div>
            <h2 className="text-sm font-semibold text-zinc-300 mb-3">
              Groups ({groups.length})
            </h2>
            <div className="space-y-2">
              {groups.map((group) => (
                <div
                  key={group.id}
                  onClick={() => setSelectedGroup(group.id)}
                  className={`p-2 rounded-md text-sm cursor-pointer ${
                    selectedGroup === group.id
                      ? 'bg-blue-600 text-white'
                      : 'bg-zinc-800 text-white hover:bg-zinc-700'
                  }`}
                >
                  <div className="font-semibold">{group.name}</div>
                  <div className="text-xs opacity-75">
                    {group.users.length} members
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Main content */}
        <div className="flex-1 flex flex-col">
          {selectedGroup ? (
            <>
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {messages.map((msg) => (
                  <div
                    key={msg.id}
                    className="bg-zinc-800 rounded-lg p-3 max-w-lg"
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <div className="font-semibold text-white text-sm">
                        {msg.user.name}
                      </div>
                      <div className="text-xs text-zinc-500">
                        {new Date(msg.timestamp).toLocaleTimeString()}
                      </div>
                    </div>
                    <div className="text-sm text-zinc-300">{msg.text}</div>
                  </div>
                ))}
              </div>
              <div className="border-t border-zinc-800 p-4">
                <input
                  type="text"
                  placeholder="Type a message..."
                  className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-md text-white"
                  onKeyPress={(e) => {
                    if (e.key === 'Enter' && e.target.value.trim()) {
                      handleSendMessage(e.target.value);
                      e.target.value = '';
                    }
                  }}
                />
              </div>
            </>
          ) : (
            <div className="flex items-center justify-center h-full text-zinc-500">
              Select a group to view messages
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
