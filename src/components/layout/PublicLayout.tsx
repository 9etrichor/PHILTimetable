import { Outlet, Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Lock } from 'lucide-react'

export function PublicLayout() {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold">CU Philosophy Department</h1>
            <p className="text-sm text-muted-foreground">Course Catalog</p>
          </div>
          <Link to="/login">
            <Button variant="outline" size="sm">
              <Lock className="h-4 w-4 mr-2" />
              Admin Login
            </Button>
          </Link>
        </div>
      </header>
      <main className="container mx-auto px-4 py-6">
        <Outlet />
      </main>
      <footer className="border-t py-4 text-center text-sm text-muted-foreground">
        © {new Date().getFullYear()} Department of Philosophy, The Chinese University of Hong Kong
      </footer>
    </div>
  )
}
