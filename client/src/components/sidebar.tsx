import { useState } from 'react';
import { Book, LayoutDashboard, Users, BarChart3, Map, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Link, useLocation } from 'wouter';
import { auth } from '@/lib/auth';
import { cn } from '@/lib/utils';

export function Sidebar() {
  const [location] = useLocation();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const user = auth.getUser();
  const isTeacher = user?.role === 'teacher';

  const teacherNavItems = [
    { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { name: 'Modules', href: '/modules', icon: Book },
    { name: 'Students', href: '/students', icon: Users },
    { name: 'Grades', href: '/grades', icon: BarChart3 },
    { name: 'Mapping', href: '/mapping', icon: Map },
  ];

  const studentNavItems = [
    { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { name: 'Modules', href: '/modules', icon: Book },
    { name: 'Grades', href: '/grades', icon: BarChart3 },
    { name: 'Mapping', href: '/mapping', icon: Map },
  ];

  const navItems = isTeacher ? teacherNavItems : studentNavItems;

  return (
    <aside className={cn(
      "bg-gray-50 border-r border-gray-200 flex flex-col transition-all duration-200",
      isCollapsed ? "w-16" : "w-48"
    )}>
      {/* Toggle Button */}
      <div className="p-2 border-b border-gray-200">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="w-full flex items-center justify-center h-8"
        >
          {isCollapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <ChevronLeft className="h-4 w-4" />
          )}
        </Button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-2 py-4">
        <div className="space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location === item.href;
            
            return (
              <Link key={item.name} href={item.href}>
                <Button
                  variant="ghost"
                  className={cn(
                    "w-full flex items-center text-left transition-colors",
                    isCollapsed ? "justify-center px-2" : "justify-start px-3",
                    "h-10",
                    isActive 
                      ? "bg-blue-100 text-blue-700 hover:bg-blue-200" 
                      : "text-gray-700 hover:bg-gray-100"
                  )}
                  title={isCollapsed ? item.name : undefined}
                >
                  <Icon className={cn(
                    "h-5 w-5 flex-shrink-0",
                    !isCollapsed && "mr-3"
                  )} />
                  {!isCollapsed && (
                    <span className="truncate text-sm font-medium">
                      {item.name}
                    </span>
                  )}
                </Button>
              </Link>
            );
          })}
        </div>
      </nav>
    </aside>
  );
}
