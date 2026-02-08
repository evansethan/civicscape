import { useState } from 'react';
import { Book, LayoutDashboard, Users, FileText, Map, FolderOpen, ChevronLeft, ChevronRight, ChevronDown, ChevronUp, Brain } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Link, useLocation } from 'wouter';
import { auth } from '@/lib/auth';
import { cn } from '@/lib/utils';

export function Sidebar() {
  const [location] = useLocation();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [mappingDropdownOpen, setMappingDropdownOpen] = useState(false);
  const user = auth.getUser();
  const isTeacher = user?.role === 'teacher';

  const mappingSubItems = [
    { name: 'National Geographic MapMaker', href: '/mapping/natgeo-mapmaker' },
    { name: 'Mapping Justice Data Hub', href: '/mapping/arcgis-hub' },
    { name: 'Trubel Atlas', href: '/mapping/trubel-atlas' },
    { name: 'Google Data Commons', href: '/mapping/data-commons' },
  ];

  const teacherNavItems = [
    { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { name: 'AI Copilot', href: '/ai-copilot', icon: Brain },
    { name: 'Classes', href: '/classes', icon: Book },
    { name: 'Students', href: '/students', icon: Users },
    { name: 'Activity Library', href: '/library', icon: FolderOpen },
    //{ name: 'Templates', href: '/templates', icon: FileText },
    { name: 'Map Gallery', href: '/mapping', icon: Map, hasDropdown: true, subItems: mappingSubItems },
  ];

  const studentNavItems = [
    { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { name: 'Classes', href: '/classes', icon: Book },
    { name: 'Map Gallery', href: '/mapping', icon: Map, hasDropdown: true, subItems: mappingSubItems },
  ];

  const navItems = isTeacher ? teacherNavItems : studentNavItems;

  return (
    <aside className={cn(
      "afterlogin-sidebar bg-gray-50 border-r border-gray-200 flex flex-col transition-all duration-200",
      isCollapsed ? "w-16" : "w-48"
    )}>
      <img src="/images/civicscape_logo.png" alt="CivicScape Logo" className="mt-5 mr-5 mb-5 ml-5 h-auto w-auto" />
      {/* Toggle Button */}
      {/* <div className="p-2 border-b border-gray-200">
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
      </div> */}

      {/* Navigation */}
      <nav className="flex-1 py-4">
        <div className="space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location === item.href || (item.subItems && item.subItems.some(subItem => location === subItem.href));
            
            if (item.hasDropdown && item.subItems) {
              return (
                <div key={item.name}>
                  <Button
                    variant="ghost"
                    onClick={() => setMappingDropdownOpen(!mappingDropdownOpen)}
                    className={cn(
                      "w-full flex items-center text-left transition-colors",
                      isCollapsed ? "justify-center px-2" : "justify-between px-3",
                      "h-10",
                      isActive 
                        ? "current-active" 
                        : "text-gray-700 hover:bg-gray-100"
                    )}
                    title={isCollapsed ? item.name : undefined}
                  >
                    <div className="flex items-center">
                      <Icon className={cn(
                        "h-5 w-5 flex-shrink-0",
                        !isCollapsed && "mr-3"
                      )} />
                      {!isCollapsed && (
                        <span className="">
                          {item.name}
                        </span>
                      )}
                    </div>
                    {!isCollapsed && (
                      mappingDropdownOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />
                    )}
                  </Button>
                  
                  {!isCollapsed && mappingDropdownOpen && (
                    <div className="submenu">
                      {item.subItems.map((subItem) => {
                        const isSubActive = location === subItem.href;
                        return (
                          <Link
                            key={subItem.name}
                            href={subItem.href}
                            className={cn(
                              "submenu_dropdown",
                              isSubActive ? "active" : "text-gray-700 hover:bg-gray-100"
                            )}
                          >
                            <span>{subItem.name}</span>
                          </Link>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            }
            
            return (
              <Link key={item.name} href={item.href}>
                <Button
                  variant="ghost"
                  className={cn(
                    "w-full flex items-center text-left transition-colors",
                    isCollapsed ? "justify-center px-2" : "justify-start px-3",
                    "h-10",
                    isActive 
                      ? "current-active hover:current-active" 
                      : "text-gray-700 hover:bg-gray-100"
                  )}
                  title={isCollapsed ? item.name : undefined}
                >
                  <Icon className={cn(
                    "h-5 w-5 flex-shrink-0",
                    !isCollapsed && "mr-3"
                  )} />
                  {!isCollapsed && (
                    <span className="">
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
