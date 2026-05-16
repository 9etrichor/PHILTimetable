import { Card, CardContent } from '@/components/ui/card'
import { Construction, AlertTriangle } from 'lucide-react'

export default function Constructing() {
  return (
    <div className="container mx-auto py-8">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Warning Icon and Title */}
        <div className="text-center space-y-4">
          <div className="flex justify-center">
            <div className="relative">
              <Construction className="h-16 w-16 text-orange-500 animate-pulse" />
              <AlertTriangle className="h-6 w-6 text-orange-600 absolute -top-2 -right-2" />
            </div>
          </div>
          
          <h1 className="text-4xl font-bold text-gray-900">Under Construction</h1>
          <p className="text-lg text-gray-600">
            This page is currently being developed
          </p>
        </div>

        {/* Warning Message */}
        <Card className="border-orange-200 bg-orange-50">
          <CardContent className="pt-6">
            <div className="text-center space-y-3">
              <AlertTriangle className="h-8 w-8 text-orange-600 mx-auto" />
              <h2 className="text-xl font-semibold text-orange-900">
                Page Under Development
              </h2>
              <p className="text-orange-700">
                We're working hard to bring you Reports and Time Table features. 
                This page will be available soon.
              </p>
            </div>
          </CardContent>
        </Card>

       

        {/* Note */}
        <div className="text-center text-sm text-gray-500">
          You can still navigate to other pages while we build this feature.
        </div>
      </div>
    </div>
  )
}
