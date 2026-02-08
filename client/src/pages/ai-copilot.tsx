import React, { useState, useRef, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Brain, Send, User, Bot, Download, Plus, MessageSquare, Pencil, Trash2, Check, X } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import * as SidebarModule from '@/components/sidebar';
import * as HeaderModule from '@/components/header';
import { cn } from '@/lib/utils';
import { useUser } from '@/hooks/use-user';

function linkifyContent(text: string) {
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  const parts = text.split(urlRegex);

  return parts.map((part, i) => {
    if (part.match(urlRegex)) {
      return (
        <a
          key={i}
          href={part}
          target="_blank"
          rel="noopener noreferrer"
          className="underline"
        >
          {part}
        </a>
      );
    }
    return <React.Fragment key={i}>{part}</React.Fragment>;
  });
}

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface Conversation {
  id: number;
  userId: number;
  title: string;
  createdAt: string;
  updatedAt: string;
}

const initialMessage: Message = {
  role: 'assistant',
  content: "Hello! I am Gio, the Civicscape AI assistant. I can help you create classroom activities and assignments using CivicScape's geographic database. For more guidance, press 'unsure'."
};

const Sidebar: any = (SidebarModule as any).Sidebar ?? (SidebarModule as any).default;
const Header: any = (HeaderModule as any).Header ?? (HeaderModule as any).default;

function getAuthHeaders(): Record<string, string> {
    const token = localStorage.getItem('auth_token');
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }
    return headers;
}

async function fetchConversations(): Promise<Conversation[]> {
    const headers = getAuthHeaders();
    const res = await fetch('/api/ai/conversations', { headers });
    if (!res.ok) return [];
    return res.json();
}

async function createConversation(title?: string): Promise<Conversation> {
    const headers = getAuthHeaders();
    const res = await fetch('/api/ai/conversations', {
        method: 'POST',
        headers,
        body: JSON.stringify({ title }),
    });
    return res.json();
}

async function updateConversationTitle(id: number, title: string): Promise<Conversation> {
    const headers = getAuthHeaders();
    const res = await fetch(`/api/ai/conversations/${id}`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({ title }),
    });
    return res.json();
}

async function deleteConversation(id: number): Promise<void> {
    const headers = getAuthHeaders();
    await fetch(`/api/ai/conversations/${id}`, {
        method: 'DELETE',
        headers,
    });
}

async function fetchMessages(conversationId: number): Promise<Message[]> {
    const headers = getAuthHeaders();
    const res = await fetch(`/api/ai/conversations/${conversationId}/messages`, { headers });
    if (!res.ok) return [initialMessage];
    const history = await res.json();
    return history.length > 0 ? history : [initialMessage];
}

async function saveMessages(conversationId: number, messages: Message[]): Promise<void> {
    const headers = getAuthHeaders();
    await fetch(`/api/ai/conversations/${conversationId}/messages`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ messages }),
    });
}

async function fetchCopilotResponse(messages: Message[]): Promise<Message> {
    const headers = getAuthHeaders();
    const res = await fetch('/api/ai/copilot', {
        method: 'POST',
        headers,
        body: JSON.stringify({ messages }),
      });

      if (!res.ok) {
        return { role: 'assistant', content: `Server error: ${res.status}` };
      }

      const json = await res.json();
      return {
        role: 'assistant',
        content: typeof json === 'string' ? json : json.answer ?? JSON.stringify(json),
      };
}

export default function AICopilot() {
  const [prompt, setPrompt] = useState('');
  const [activeConversationId, setActiveConversationId] = useState<number | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [conversationToDelete, setConversationToDelete] = useState<number | null>(null);
  const user = useUser();
  const queryClient = useQueryClient();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { data: conversations = [], isLoading: conversationsLoading } = useQuery<Conversation[]>({
    queryKey: ['aiConversations', user?.id],
    queryFn: fetchConversations,
    enabled: !!user,
  });

  const { data: messages = [initialMessage], isLoading: messagesLoading } = useQuery<Message[]>({
    queryKey: ['aiMessages', activeConversationId],
    queryFn: () => activeConversationId ? fetchMessages(activeConversationId) : Promise.resolve([initialMessage]),
    enabled: !!activeConversationId,
    staleTime: Infinity,
    gcTime: Infinity,
  });

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const createConversationMutation = useMutation({
    mutationFn: () => createConversation(),
    onSuccess: (newConversation) => {
      queryClient.invalidateQueries({ queryKey: ['aiConversations', user?.id] });
      setActiveConversationId(newConversation.id);
      queryClient.setQueryData(['aiMessages', newConversation.id], [initialMessage]);
    },
  });

  const updateTitleMutation = useMutation({
    mutationFn: ({ id, title }: { id: number; title: string }) => updateConversationTitle(id, title),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['aiConversations', user?.id] });
      setEditingId(null);
    },
  });

  const deleteConversationMutation = useMutation({
    mutationFn: (id: number) => deleteConversation(id),
    onSuccess: (_, deletedId) => {
      queryClient.invalidateQueries({ queryKey: ['aiConversations', user?.id] });
      if (activeConversationId === deletedId) {
        setActiveConversationId(null);
      }
    },
  });

  const handleNewChat = async () => {
    createConversationMutation.mutate();
  };

  const handleSelectConversation = (conversation: Conversation) => {
    setActiveConversationId(conversation.id);
  };

  const handleStartEdit = (conversation: Conversation, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingId(conversation.id);
    setEditTitle(conversation.title);
  };

  const handleSaveEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (editingId && editTitle.trim()) {
      updateTitleMutation.mutate({ id: editingId, title: editTitle.trim() });
    }
  };

  const handleCancelEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingId(null);
    setEditTitle('');
  };

  const handleDeleteConversation = (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    setConversationToDelete(id);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    if (conversationToDelete) {
      deleteConversationMutation.mutate(conversationToDelete);
    }
    setDeleteDialogOpen(false);
    setConversationToDelete(null);
  };

  const submitPrompt = async (messageContent: string) => {
    if (!messageContent.trim() || !activeConversationId) return;

    const userMessage: Message = { role: 'user', content: messageContent };
    const newMessages = [...messages, userMessage];
    
    queryClient.setQueryData(['aiMessages', activeConversationId], newMessages);

    setPrompt('');
    setIsLoading(true);

    try {
      const assistantMessage = await fetchCopilotResponse(newMessages);
      const updatedMessages = [...newMessages, assistantMessage];
      
      queryClient.setQueryData(['aiMessages', activeConversationId], updatedMessages);

      if (activeConversationId) {
        await saveMessages(activeConversationId, updatedMessages);
        
        if (messages.length <= 1 && messageContent.trim()) {
          const title = messageContent.slice(0, 40) + (messageContent.length > 40 ? '...' : '');
          updateTitleMutation.mutate({ id: activeConversationId, title });
        }
      }
    } catch (err) {
      const assistantMessage: Message = { role: 'assistant', content: 'A network error occurred. Please try again.' };
      queryClient.setQueryData(['aiMessages', activeConversationId], [...newMessages, assistantMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAsk = () => {
    submitPrompt(prompt);
  };

  const handleUnsureClick = () => {
    submitPrompt('help');
  };

  const handleDownloadChat = () => {
    const chatHistory = messages
      .map(m => `${m.role.toUpperCase()}:\n${m.content}`)
      .join('\n\n---\n\n');

    if (!chatHistory) return;

    const blob = new Blob([chatHistory], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'civicscape-copilot-chat.txt';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex h-screen">
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Conversation</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this conversation? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setConversationToDelete(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-red-500 hover:bg-red-600">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <Header />
        <main className="flex-1 flex overflow-hidden">
          <div className="w-64 border-r bg-slate-50 flex flex-col">
            <div className="p-3 border-b">
              <Button onClick={handleNewChat} className="w-full" disabled={createConversationMutation.isPending}>
                <Plus className="h-4 w-4 mr-2" />
                New Chat
              </Button>
            </div>
            <ScrollArea className="flex-1">
              <div className="p-2 space-y-1">
                {conversationsLoading ? (
                  <div className="p-4 text-center text-sm text-slate-500">Loading...</div>
                ) : conversations.length === 0 ? (
                  <div className="p-4 text-center text-sm text-slate-500">
                    No conversations yet. Start a new chat!
                  </div>
                ) : (
                  conversations.map((conversation) => (
                    <div
                      key={conversation.id}
                      onClick={() => handleSelectConversation(conversation)}
                      className={cn(
                        'group flex items-center gap-2 p-2 rounded-lg cursor-pointer hover:bg-slate-200 transition-colors',
                        activeConversationId === conversation.id && 'bg-slate-200'
                      )}
                    >
                      <MessageSquare className="h-4 w-4 flex-shrink-0 text-slate-500" />
                      {editingId === conversation.id ? (
                        <div className="flex-1 flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                          <Input
                            value={editTitle}
                            onChange={(e) => setEditTitle(e.target.value)}
                            className="h-7 text-sm"
                            autoFocus
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleSaveEdit(e as any);
                              if (e.key === 'Escape') handleCancelEdit(e as any);
                            }}
                          />
                          <Button size="icon" variant="ghost" className="h-6 w-6" onClick={handleSaveEdit}>
                            <Check className="h-3 w-3" />
                          </Button>
                          <Button size="icon" variant="ghost" className="h-6 w-6" onClick={handleCancelEdit}>
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                      ) : (
                        <>
                          <span className="flex-1 text-sm truncate">{conversation.title}</span>
                          <div className="hidden group-hover:flex items-center gap-1">
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-6 w-6"
                              onClick={(e) => handleStartEdit(conversation, e)}
                            >
                              <Pencil className="h-3 w-3" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-6 w-6 text-red-500 hover:text-red-700"
                              onClick={(e) => handleDeleteConversation(conversation.id, e)}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </>
                      )}
                    </div>
                  ))
                )}
              </div>
            </ScrollArea>
          </div>

          <div className="flex-1 flex flex-col p-6 overflow-hidden">
            <div className="flex items-center gap-3 mb-4">
              <div className="flex-1">
                <h1 className="text-2xl font-bold">Civicscape Copilot</h1>
              </div>
              {activeConversationId && (
                <Button onClick={handleDownloadChat} variant="outline">
                  <Download className="mr-2 h-4 w-4" />
                  Download Chat
                </Button>
              )}
            </div>

            {!activeConversationId ? (
              <Card className="flex-1 flex items-center justify-center">
                <div className="text-center">
                  <MessageSquare className="h-12 w-12 mx-auto mb-4 text-slate-400" />
                  <h2 className="text-lg font-medium text-slate-700 mb-2">Welcome to Civicscape Copilot</h2>
                  <p className="text-slate-500 mb-4">Start a new conversation or select one from the sidebar</p>
                  <Button onClick={handleNewChat} disabled={createConversationMutation.isPending}>
                    <Plus className="h-4 w-4 mr-2" />
                    Start New Chat
                  </Button>
                </div>
              </Card>
            ) : (
              <Card className="flex-1 flex flex-col overflow-hidden">
                <CardContent className="flex-1 flex flex-col p-0 overflow-hidden">
                  <div className="flex-1 space-y-4 p-6 pr-2 overflow-y-auto">
                    {messages.map((message, index) => (
                      <div
                        key={index}
                        className={cn(
                          'flex items-start gap-3',
                          message.role === 'user' ? 'justify-end' : 'justify-start'
                        )}
                      >
                        {message.role === 'assistant' && (
                          <div className="bg-slate-200 p-2 rounded-full">
                            <Bot className="h-5 w-5 text-slate-600" />
                          </div>
                        )}
                        <div
                          className={cn(
                            'p-3 rounded-lg whitespace-pre-wrap max-w-[80%]',
                            message.role === 'user'
                              ? 'bg-blue-500 text-white'
                              : 'bg-slate-100 text-slate-800'
                          )}
                        >
                          {linkifyContent(message.content)}
                        </div>
                        {message.role === 'user' && (
                          <div className="bg-blue-100 p-2 rounded-full">
                            <User className="h-5 w-5 text-blue-600" />
                          </div>
                        )}
                      </div>
                    ))}
                    {(isLoading || messagesLoading) && (
                      <div className="flex items-start gap-3 justify-start">
                        <div className="bg-slate-200 p-2 rounded-full"><Bot className="h-5 w-5 text-slate-600" /></div>
                        <div className="p-3 rounded-lg bg-slate-100 text-slate-800">
                          <div className="flex items-center gap-2">
                            <div className="h-2 w-2 bg-slate-400 rounded-full animate-pulse [animation-delay:-0.3s]"></div>
                            <div className="h-2 w-2 bg-slate-400 rounded-full animate-pulse [animation-delay:-0.15s]"></div>
                            <div className="h-2 w-2 bg-slate-400 rounded-full animate-pulse"></div>
                          </div>
                        </div>
                      </div>
                    )}
                    <div ref={messagesEndRef} />
                  </div>
                  <div className="flex items-center gap-2 p-4 border-t">
                    <Textarea
                      placeholder="Ask for curriculum ideas, lesson plans, or activities..."
                      value={prompt}
                      onChange={(e) => setPrompt(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          handleAsk();
                        }
                      }}
                      rows={1}
                      className="flex-1 resize-none"
                    />
                    <Button variant="outline" onClick={handleUnsureClick} disabled={isLoading}>
                      Unsure?
                    </Button>
                    <Button onClick={handleAsk} disabled={isLoading || !prompt.trim()}>
                      <Send className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
