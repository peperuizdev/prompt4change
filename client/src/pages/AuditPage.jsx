import { useState } from 'react'
import AuditChatbot from '../components/AuditChatbot'

export default function AuditPage() {
  return (
    <div className="h-[calc(100vh-5rem)]">
      <AuditChatbot onClose={() => window.history.back()} />
    </div>
  )
}
