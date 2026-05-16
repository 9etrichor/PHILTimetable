import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabaseClient'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { Skeleton } from '@/components/ui/skeleton'
import { Search, Eye, RefreshCw } from 'lucide-react'

interface AuditLog {
  id: string
  table_name: string
  record_id: string
  operation: string
  old_values: Record<string, unknown> | null
  new_values: Record<string, unknown> | null
  timestamp: string
  admin_name: string
  changed_columns?: string[]
}

export function ActionLogs() {
  const [logs, setLogs] = useState<AuditLog[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [tableFilter, setTableFilter] = useState<string>('all')
  const [actionFilter, setActionFilter] = useState<string>('all')
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null)
  const [detailOpen, setDetailOpen] = useState(false)

  useEffect(() => {
    fetchLogs()
  }, [])

  const fetchLogs = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('audit_log')
        .select('*')
        .order('timestamp', { ascending: false })
        .limit(500)

      if (error) throw error

      const transformedLogs: AuditLog[] = (data || []).map((log) => ({
        id: log.id,
        table_name: log.table_name,
        operation: log.operation,
        timestamp: log.timestamp,
        admin_name: 'System',
        changed_columns: log.changed_columns || [],
        record_id: log.record_id,
        old_values: log.old_values || null,
        new_values: log.new_values || null,
      }))

      setLogs(transformedLogs)
    } catch (err) {
      console.error('Failed to fetch audit logs:', err)
    } finally {
      setLoading(false)
    }
  }

  const filteredLogs = logs.filter((log) => {
    const matchesSearch =
      searchQuery === '' ||
      log.table_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.admin_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.record_id.toLowerCase().includes(searchQuery.toLowerCase())

    const matchesTable = tableFilter === 'all' || log.table_name === tableFilter
    const matchesAction = actionFilter === 'all' || log.operation === actionFilter

    return matchesSearch && matchesTable && matchesAction
  })

  const uniqueTables = [...new Set(logs.map((l) => l.table_name))]
  const uniqueActions = [...new Set(logs.map((l) => l.operation))]

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleString()
  }

  const getActionBadge = (action: string) => {
    switch (action.toLowerCase()) {
      case 'insert':
      case 'create':
        return <Badge className="bg-green-600">Create</Badge>
      case 'update':
        return <Badge className="bg-blue-600">Update</Badge>
      case 'delete':
        return <Badge variant="destructive">Delete</Badge>
      default:
        return <Badge variant="outline">{action}</Badge>
    }
  }

  const getChangedFields = (log: AuditLog) => {
    const changes: { field: string; from: unknown; to: unknown }[] = []
    const oldData = log.old_values || {}
    const newData = log.new_values || {}

    const allKeys = new Set([...Object.keys(oldData), ...Object.keys(newData)])
    allKeys.forEach((key) => {
      if (JSON.stringify(oldData[key]) !== JSON.stringify(newData[key])) {
        changes.push({
          field: key,
          from: oldData[key],
          to: newData[key],
        })
      }
    })

    return changes
  }

  const openDetail = (log: AuditLog) => {
    setSelectedLog(log)
    setDetailOpen(true)
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Action Logs</h1>
          <p className="text-muted-foreground">Track all changes made in the system</p>
        </div>
        <Button variant="outline" onClick={fetchLogs}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      <div className="flex flex-wrap gap-4 items-center">
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by table, admin, or record ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>

        <Select value={tableFilter} onValueChange={setTableFilter}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Table" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Tables</SelectItem>
            {uniqueTables.map((table) => (
              <SelectItem key={table} value={table}>
                {table}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={actionFilter} onValueChange={setActionFilter}>
          <SelectTrigger className="w-[120px]">
            <SelectValue placeholder="Action" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Actions</SelectItem>
            {uniqueActions.map((action) => (
              <SelectItem key={action} value={action}>
                {action}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <span className="text-sm text-muted-foreground">
          {filteredLogs.length} of {logs.length} logs
        </span>
      </div>

      {loading ? (
        <div className="space-y-2">
          {[...Array(10)].map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      ) : (
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead className="w-[180px]">Timestamp</TableHead>
                <TableHead className="w-[120px]">Table</TableHead>
                <TableHead className="w-[100px]">Action</TableHead>
                <TableHead>Admin</TableHead>
                <TableHead className="w-[200px]">Record ID</TableHead>
                <TableHead className="w-[80px] text-center">Details</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredLogs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                    No logs found
                  </TableCell>
                </TableRow>
              ) : (
                filteredLogs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell className="text-sm">{formatDate(log.timestamp)}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{log.table_name}</Badge>
                    </TableCell>
                    <TableCell>{getActionBadge(log.operation)}</TableCell>
                    <TableCell>{log.admin_name}</TableCell>
                    <TableCell className="font-mono text-xs truncate max-w-[200px]">
                      {log.record_id}
                    </TableCell>
                    <TableCell>
                      <Button variant="ghost" size="sm" onClick={() => openDetail(log)}>
                        <Eye className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      )}

      <Sheet open={detailOpen} onOpenChange={setDetailOpen}>
        <SheetContent className="overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Log Details</SheetTitle>
            <SheetDescription>
              {selectedLog?.table_name} - {selectedLog?.operation}
            </SheetDescription>
          </SheetHeader>

          {selectedLog && (
            <div className="mt-6 space-y-6">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Timestamp</p>
                  <p className="font-medium">{formatDate(selectedLog.timestamp)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Admin</p>
                  <p className="font-medium">{selectedLog.admin_name}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Table</p>
                  <p className="font-medium">{selectedLog.table_name}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Action</p>
                  {getActionBadge(selectedLog.operation)}
                </div>
              </div>

              <div>
                <p className="text-muted-foreground text-sm mb-2">Record ID</p>
                <code className="text-xs bg-muted px-2 py-1 rounded block break-all">
                  {selectedLog.record_id}
                </code>
              </div>

              <div>
                <p className="text-muted-foreground text-sm mb-2">Changes</p>
                <div className="space-y-2">
                  {getChangedFields(selectedLog).length === 0 ? (
                    <p className="text-sm text-muted-foreground">No field changes recorded</p>
                  ) : (
                    getChangedFields(selectedLog).map((change, i) => (
                      <div key={i} className="bg-muted/50 rounded p-3 text-sm">
                        <p className="font-medium mb-1">{change.field}</p>
                        <div className="grid grid-cols-2 gap-2 text-xs">
                          <div>
                            <span className="text-muted-foreground">From: </span>
                            <span className="text-red-600">
                              {change.from !== undefined ? JSON.stringify(change.from) : 'null'}
                            </span>
                          </div>
                          <div>
                            <span className="text-muted-foreground">To: </span>
                            <span className="text-green-600">
                              {change.to !== undefined ? JSON.stringify(change.to) : 'null'}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {selectedLog.old_values && (
                <div>
                  <p className="text-muted-foreground text-sm mb-2">Old Data (Raw)</p>
                  <pre className="text-xs bg-muted p-3 rounded overflow-auto max-h-40">
                    {JSON.stringify(selectedLog.old_values, null, 2)}
                  </pre>
                </div>
              )}

              {selectedLog.new_values && (
                <div>
                  <p className="text-muted-foreground text-sm mb-2">New Data (Raw)</p>
                  <pre className="text-xs bg-muted p-3 rounded overflow-auto max-h-40">
                    {JSON.stringify(selectedLog.new_values, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  )
}
