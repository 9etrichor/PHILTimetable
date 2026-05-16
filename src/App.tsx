import { TooltipProvider } from '@/components/ui/tooltip'
import Timetable from '@/pages/TimeTable'

function App() {
  return (
    <TooltipProvider>
      <Timetable />
    </TooltipProvider>
  )
}

export default App
