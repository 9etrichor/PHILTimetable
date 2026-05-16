import { BookOpen, LayoutDashboard, Users, Home, Calendar, LogOut, ClipboardList, Upload, HelpCircle, Clock, FileText } from 'lucide-react'
import { useLocation, Link, useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
} from '@/components/ui/sidebar'
import { Button } from '@/components/ui/button'

const navItems = [
  {
    title: 'Dashboard',
    url: '/admin',
    icon: LayoutDashboard,
  },
  {
    title: 'Course Catalog',
    url: '/admin/courses',
    icon: BookOpen,
  },
  {
    title: 'Classes',
    url: '/admin/classes',
    icon: Calendar,
  },
  {
    title: 'Instructors',
    url: '/admin/instructors',
    icon: Users,
  },
  {
    title: 'Import Courses',
    url: '/admin/import',
    icon: Upload,
  },
  {
    title: 'Time Table',
    url: '/admin/timetable',
    icon: Clock,
  },
  {
    title: 'Reports',
    url: '/admin/constructing',
    icon: FileText,
  },
  {
    title: 'Action Logs',
    url: '/admin/logs',
    icon: ClipboardList,
  },
  {
    title: 'Support Tickets',
    url: '/admin/support',
    icon: HelpCircle,
  },
]

export function AppSidebar() {
  const location = useLocation()
  const navigate = useNavigate()
  const { signOut, user } = useAuth()

  const handleSignOut = async () => {
    await signOut()
    navigate('/login')
  }

  return (
    <Sidebar>
      <SidebarHeader className="border-b px-6 py-4">
        <h1 className="text-lg font-semibold">CU PHI DB</h1>
        {user && (
          <p className="text-xs text-muted-foreground truncate">{user.email}</p>
        )}
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    isActive={location.pathname === item.url}
                  >
                    <Link to={item.url}>
                      <item.icon />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="border-t p-4 space-y-2">
        <Link to="/">
          <Button variant="outline" className="w-full">
            <Home className="h-4 w-4 mr-2" />
            Back to Public Site
          </Button>
        </Link>
        <Button variant="ghost" className="w-full" onClick={handleSignOut}>
          <LogOut className="h-4 w-4 mr-2" />
          Sign Out
        </Button>
      </SidebarFooter>
    </Sidebar>
  )
}
