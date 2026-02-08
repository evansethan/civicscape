import React, { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { MessageCircle, Send, ArrowLeft, Plus, Users, Search } from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';

interface Conversation {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  role: string;
  last_message: string;
  last_message_at: string;
  is_sent_by_me: boolean;
  unread_count: number;
}

interface Message {
  id: number;
  senderId: number;
  receiverId: number;
  content: string;
  isRead: boolean;
  createdAt: string;
}

interface User {
  id: number;
  role: string;
}

interface ChatProps {
  user: User;
}

export function Chat({ user }: ChatProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [showNewChat, setShowNewChat] = useState(false);
  const [newMessage, setNewMessage] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();

  // Get conversations list
  const { data: conversations = [] } = useQuery({
    queryKey: ['/api/messages/conversations'],
    enabled: isOpen,
  });

  // Get unread message count
  const { data: unreadCount = { count: 0 } } = useQuery({
    queryKey: ['/api/messages/unread/count'],
    refetchInterval: 30000, // Poll every 30 seconds
  });

  // Get messages for selected conversation
  const { data: messages = [] } = useQuery({
    queryKey: ['/api/messages', selectedConversation?.id],
    enabled: !!selectedConversation,
  });

  // Get available users to start new conversations with
  const { data: availableUsers = [] } = useQuery({
    queryKey: user.role === 'student' 
      ? ['/api/students', user.id, 'teachers'] 
      : ['/api/users', { role: 'student' }],
    queryFn: async () => {
      if (user.role === 'student') {
        // For students, get only teachers they are enrolled with
        const response = await apiRequest('GET', `/api/students/${user.id}/teachers`);
        return response.json();
      } else {
        // For teachers, get all students
        const response = await apiRequest('GET', `/api/users?role=student`);
        return response.json();
      }
    },
    enabled: showNewChat,
  });

  // Send message mutation
  const sendMessageMutation = useMutation({
    mutationFn: (data: { receiverId: number; content: string }) =>
      apiRequest('POST', '/api/messages', data),
    onSuccess: () => {
      setNewMessage('');
      queryClient.invalidateQueries({ queryKey: ['/api/messages'] });
      queryClient.invalidateQueries({ queryKey: ['/api/messages/conversations'] });
      queryClient.invalidateQueries({ queryKey: ['/api/messages/unread/count'] });
    },
  });

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = () => {
    if (!selectedConversation || !newMessage.trim()) return;
    
    sendMessageMutation.mutate({
      receiverId: selectedConversation.id,
      content: newMessage.trim(),
    });
  };

  const startNewConversation = (targetUser: any) => {
    // Convert user to conversation format and select it
    const newConversation: Conversation = {
      id: targetUser.id,
      first_name: targetUser.firstName || targetUser.first_name,
      last_name: targetUser.lastName || targetUser.last_name,
      email: targetUser.email,
      role: targetUser.role,
      last_message: '',
      last_message_at: '',
      is_sent_by_me: false,
      unread_count: 0,
    };
    
    setSelectedConversation(newConversation);
    setShowNewChat(false);
    setSearchQuery(''); // Clear search when starting conversation
  };

  // Filter available users based on search query
  const filteredUsers = React.useMemo(() => {
    if (!searchQuery.trim() || !Array.isArray(availableUsers)) return availableUsers;
    
    const query = searchQuery.toLowerCase().trim();
    return availableUsers.filter((targetUser: any) => {
      const firstName = (targetUser.firstName || targetUser.first_name || '').toLowerCase();
      const lastName = (targetUser.lastName || targetUser.last_name || '').toLowerCase();
      const fullName = `${firstName} ${lastName}`.trim();
      const email = (targetUser.email || '').toLowerCase();
      
      return fullName.includes(query) || 
             firstName.includes(query) || 
             lastName.includes(query) || 
             email.includes(query);
    });
  }, [availableUsers, searchQuery]);

  const getInitials = (firstName: string, lastName: string) => {
    return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
  };

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  const formatLastMessageTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) {
      return formatTime(dateString);
    } else if (diffDays === 1) {
      return 'Yesterday';
    } else if (diffDays < 7) {
      return date.toLocaleDateString([], { weekday: 'short' });
    } else {
      return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="relative">
          <MessageCircle className="h-5 w-5" />
          {unreadCount.count > 0 && (
            <Badge 
              variant="destructive" 
              className="absolute -top-1 -right-1 h-5 w-5 rounded-full p-0 text-xs flex items-center justify-center"
            >
              {unreadCount.count > 99 ? '99+' : unreadCount.count}
            </Badge>
          )}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md h-[600px] p-0">
        <DialogHeader className="p-4 border-b">
          <div className="flex items-center gap-2">
            {(selectedConversation || showNewChat) && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSelectedConversation(null);
                  setShowNewChat(false);
                  setSearchQuery(''); // Clear search when going back
                }}
                className="p-1 h-8 w-8"
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
            )}
            <DialogTitle className="text-lg">
              {selectedConversation 
                ? `${selectedConversation.first_name} ${selectedConversation.last_name}`
                : showNewChat
                ? 'Start New Chat'
                : 'Messages'
              }
            </DialogTitle>
          </div>
          <DialogDescription className="sr-only">
            Chat with students and teachers
          </DialogDescription>
        </DialogHeader>

        {!selectedConversation && !showNewChat ? (
          // Conversations List
          <ScrollArea className="flex-1 p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-medium text-slate-700">Recent Chats</h3>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowNewChat(true)}
                className="flex items-center gap-2 edugis-btn-primary"
              >
                <Plus className="h-4 w-4" />
                New Chat
              </Button>
            </div>
            
            {conversations.length === 0 ? (
              <div className="text-center text-slate-500 py-8">
                <MessageCircle className="h-12 w-12 mx-auto mb-4 text-slate-300" />
                <p>No conversations yet</p>
                <p className="text-sm mt-2">
                  Click "New Chat" to start messaging {user.role === 'teacher' ? 'students' : 'teachers'}
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {conversations.map((conversation: Conversation) => (
                  <div
                    key={conversation.id}
                    onClick={() => setSelectedConversation(conversation)}
                    className="flex items-center gap-3 p-3 hover:bg-slate-50 rounded-lg cursor-pointer border transition-colors"
                  >
                    <Avatar className="h-10 w-10">
                      <AvatarFallback className="bg-slate-200 text-slate-600">
                        {getInitials(conversation.first_name, conversation.last_name)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <p className="font-medium text-sm truncate">
                          {conversation.first_name} {conversation.last_name}
                        </p>
                        <div className="flex items-center gap-1">
                          {conversation.unread_count > 0 && (
                            <Badge variant="destructive" className="h-5 w-5 rounded-full p-0 text-xs flex items-center justify-center">
                              {conversation.unread_count}
                            </Badge>
                          )}
                          {conversation.last_message_at && (
                            <span className="text-xs text-slate-500">
                              {formatLastMessageTime(conversation.last_message_at)}
                            </span>
                          )}
                        </div>
                      </div>
                      <p className="text-xs text-slate-500 truncate">
                        {conversation.role === 'teacher' ? '👨‍🏫 Teacher' : '👨‍🎓 Student'}
                      </p>
                      {conversation.last_message && (
                        <p className="text-sm text-slate-600 truncate mt-1">
                          {conversation.is_sent_by_me ? 'You: ' : ''}
                          {conversation.last_message}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        ) : showNewChat ? (
          // New Chat - Select User
          <ScrollArea className="flex-1 p-4">
            <div className="mb-4 space-y-3">
              <h3 className="font-medium text-slate-700 flex items-center gap-2">
                <Users className="h-4 w-4" />
                Choose {user.role === 'teacher' ? 'Student' : 'Teacher'} to Message
              </h3>
              
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  placeholder={`Search ${user.role === 'teacher' ? 'students' : 'teachers'}...`}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            
            {filteredUsers.length === 0 ? (
              <div className="text-center text-slate-500 py-8">
                <Users className="h-12 w-12 mx-auto mb-4 text-slate-300" />
                <p>
                  {searchQuery.trim() 
                    ? `No ${user.role === 'teacher' ? 'students' : 'teachers'} found matching "${searchQuery}"`
                    : `No ${user.role === 'teacher' ? 'students' : 'teachers'} available`
                  }
                </p>
                {searchQuery.trim() && (
                  <p className="text-sm mt-2">Try adjusting your search terms</p>
                )}
              </div>
            ) : (
              <div className="space-y-2">
                {filteredUsers.map((targetUser: any) => (
                  <div
                    key={targetUser.id}
                    onClick={() => startNewConversation(targetUser)}
                    className="flex items-center gap-3 p-3 hover:bg-slate-50 rounded-lg cursor-pointer border transition-colors"
                  >
                    <Avatar className="h-10 w-10">
                      <AvatarFallback className="bg-slate-200 text-slate-600">
                        {getInitials(targetUser.firstName || targetUser.first_name, targetUser.lastName || targetUser.last_name)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm">
                        {targetUser.firstName || targetUser.first_name} {targetUser.lastName || targetUser.last_name}
                      </p>
                      <p className="text-xs text-slate-500 truncate">
                        {targetUser.role === 'teacher' ? '👨‍🏫 Teacher' : '👨‍🎓 Student'} • {targetUser.email}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        ) : (
          // Messages View
          <>
            <ScrollArea className="flex-1 p-4">
              <div className="space-y-4">
                {messages.map((message: Message) => (
                  <div
                    key={message.id}
                    className={`flex ${message.senderId === user.id ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[70%] rounded-lg px-3 py-2 ${
                        message.senderId === user.id
                          ? 'bg-blue-500 text-white'
                          : 'bg-slate-100 text-slate-900'
                      }`}
                    >
                      <p className="text-sm">{message.content}</p>
                      <p className={`text-xs mt-1 ${
                        message.senderId === user.id ? 'text-blue-100' : 'text-slate-500'
                      }`}>
                        {formatTime(message.createdAt)}
                      </p>
                    </div>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>
            </ScrollArea>

            {/* Message Input */}
            <div className="p-4 border-t">
              <div className="flex gap-2">
                <Input
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="Type a message..."
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSendMessage();
                    }
                  }}
                  disabled={sendMessageMutation.isPending}
                />
                <Button
                  onClick={handleSendMessage}
                  disabled={!newMessage.trim() || sendMessageMutation.isPending}
                  size="sm"
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}