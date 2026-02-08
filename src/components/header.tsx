import { Bell, ChevronDown, MapPin } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useLocation } from 'wouter';
import { apiRequest } from '@/lib/queryClient';
import { auth } from '@/lib/auth';
import { Chat } from '@/components/chat';

export function Header() {
  const user = auth.getUser();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();
  
  // Fetch notifications
  const { data: notifications = [] } = useQuery({
    queryKey: ['/api/notifications'],
    enabled: !!user,
  }) as { data: any[] };

  // Fetch unread count
  const { data: notificationCount } = useQuery({
    queryKey: ['/api/notifications/count'],
    enabled: !!user,
  }) as { data: { count: number } | undefined };

  // Mark notifications as read
  const markAsRead = useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/notifications/mark-read', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
          'Content-Type': 'application/json',
        },
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/notifications/count'] });
      queryClient.invalidateQueries({ queryKey: ['/api/notifications'] });
    },
  });
  
  const handleLogout = () => {
    auth.logout();
  };

  const handleViewAllNotifications = () => {
    markAsRead.mutate();
  };

  // Mark individual notification as read
  const markSingleAsRead = useMutation({
    mutationFn: async (notificationId: number) => {
      const response = await fetch(`/api/notifications/${notificationId}/read`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
          'Content-Type': 'application/json',
        },
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/notifications/count'] });
      queryClient.invalidateQueries({ queryKey: ['/api/notifications'] });
    },
  });

  const handleNotificationClick = (notification: any) => {
    // Mark as read if unread
    if (!notification.isRead) {
      markSingleAsRead.mutate(notification.id);
    }

    // Navigate based on notification type
    if (notification.type === 'assignment_graded' && notification.submissionId) {
      // For students, go to submission detail page to see their grade
      if (user?.role === 'student') {
        setLocation(`/submissions/${notification.submissionId}`);
      } else {
        // For teachers, go to grading page
        setLocation(`/grading/${notification.submissionId}`);
      }
    } else if (notification.type === 'new_assignment' && notification.assignmentId) {
      // For students, go to assignment submission page
      if (user?.role === 'student') {
        setLocation(`/assignments/${notification.assignmentId}/submit`);
      } else {
        // For teachers, go to assignment detail page
        setLocation(`/assignments/${notification.assignmentId}`);
      }
    } else if (notification.type === 'submission_received' && notification.submissionId) {
      // For teachers, go to grading page
      setLocation(`/grading/${notification.submissionId}`);
    } else if (notification.type === 'comment_received' && notification.submissionId) {
      // For students, go to submission detail page to see the comment
      if (user?.role === 'student') {
        setLocation(`/submissions/${notification.submissionId}`);
      } else {
        // For teachers, go to grading page
        setLocation(`/grading/${notification.submissionId}`);
      }
    }
  };

  return (
    <header className="edugis-header">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              {/* <MapPin className="h-8 w-8 text-primary" />
              <h1 className="text-xl font-bold text-slate-800">CivicScape</h1> */}
            </div>
          </div>
          
          <div className="flex items-center space-x-4">
            {/* {user && <Chat user={user} />} */}
            
            {/* <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="relative">
                  <Bell className="h-5 w-5" />
                  {(notificationCount?.count ?? 0) > 0 && (
                    <Badge 
                      variant="destructive" 
                      className="absolute -top-1 -right-1 h-5 w-5 rounded-full p-0 text-xs flex items-center justify-center"
                    >
                      {(notificationCount?.count ?? 0) > 9 ? '9+' : notificationCount?.count}
                    </Badge>
                  )}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-80">
                <div className="flex items-center justify-between p-3 border-b">
                  <h3 className="font-semibold">Notifications</h3>
                  {(notificationCount?.count ?? 0) > 0 && (
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={handleViewAllNotifications}
                      disabled={markAsRead.isPending}
                    >
                      Mark all read
                    </Button>
                  )}
                </div>
                <ScrollArea className="h-80">
                  {notifications.length === 0 ? (
                    <div className="p-4 text-center text-slate-500">
                      No notifications yet
                    </div>
                  ) : (
                    <div className="space-y-1">
                      {notifications.slice(0, 10).map((notification: any) => (
                        <div
                          key={notification.id}
                          className={`p-3 border-b hover:bg-slate-100 cursor-pointer transition-colors ${
                            !notification.isRead ? 'bg-blue-50' : ''
                          }`}
                          onClick={() => handleNotificationClick(notification)}
                        >
                          <div className="flex items-start space-x-3">
                            <div className="flex-1">
                              <p className="font-medium text-sm">{notification.title}</p>
                              <p className="text-sm text-slate-600 mt-1">{notification.message}</p>
                              <p className="text-xs text-slate-400 mt-1">
                                {new Date(notification.createdAt).toLocaleDateString('en-US', {
                                  month: 'short',
                                  day: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit'
                                })}
                              </p>
                            </div>
                            {!notification.isRead && (
                              <div className="w-2 h-2 bg-blue-500 rounded-full mt-1"></div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </DropdownMenuContent>
            </DropdownMenu>
             */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="flex items-center space-x-2">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback>
                      {user?.firstName?.[0]}{user?.lastName?.[0]}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-sm font-medium text-slate-700">
                    {user?.firstName} {user?.lastName}
                  </span>
                  <ChevronDown className="h-4 w-4 text-slate-500" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {/* <DropdownMenuItem>Profile</DropdownMenuItem>
                <DropdownMenuItem>Settings</DropdownMenuItem> */}
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout}>
                  Logout
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>
    </header>
  );
}
