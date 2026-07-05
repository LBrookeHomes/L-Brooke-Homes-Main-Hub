import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { decisionsApi } from '../../api/decisions'
import type { DecisionMessage } from '@weebrook/shared/types'
import { format } from 'date-fns'

interface Props {
  decision: { id: string; title: string; status: string }
  projectId: string
}

export default function DecisionThread({ decision, projectId }: Props) {
  const qc = useQueryClient()
  const [body, setBody] = useState('')

  const { data: full } = useQuery({
    queryKey: ['decision', decision.id],
    queryFn: () => decisionsApi.get(decision.id),
  })

  const msgMut = useMutation({
    mutationFn: (text: string) => decisionsApi.addMessage(decision.id, text),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['decision', decision.id] })
      setBody('')
    },
  })

  const messages = full?.messages || []
  const isLocked = decision.status === 'locked'

  return (
    <div style={styles.container}>
      <div style={styles.thread}>
        {messages.length === 0 && <p style={styles.empty}>No messages yet. Start the conversation.</p>}
        {messages.map((msg: DecisionMessage) => (
          <div key={msg.id} style={{ ...styles.bubble, ...(msg.senderType === 'gc' ? styles.gcBubble : styles.clientBubble) }}>
            <div style={styles.bubbleHeader}>
              <span style={styles.sender}>{msg.senderType === 'gc' ? 'You (GC)' : 'Client'}</span>
              <span style={styles.time}>{format(new Date(msg.createdAt), 'MMM d, h:mm a')}</span>
            </div>
            <p style={styles.bubbleText}>{msg.body}</p>
          </div>
        ))}
      </div>

      {!isLocked && (
        <div style={styles.compose}>
          <textarea
            style={styles.textarea}
            placeholder="Type a message…"
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={3}
          />
          <button
            style={styles.sendBtn}
            disabled={!body.trim() || msgMut.isPending}
            onClick={() => body.trim() && msgMut.mutate(body.trim())}
          >
            Send
          </button>
        </div>
      )}
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  container: { display: 'flex', flexDirection: 'column', gap: '1rem' },
  thread: { display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: 360, overflowY: 'auto' },
  empty: { color: '#9ca3af', fontSize: '0.875rem', textAlign: 'center', padding: '1.5rem' },
  bubble: { padding: '0.65rem 0.85rem', borderRadius: 8, maxWidth: '85%' },
  gcBubble: { background: '#f0fdf4', borderBottomRightRadius: 2, alignSelf: 'flex-end', border: '1px solid #bbf7d0' },
  clientBubble: { background: '#f0f4ff', borderBottomLeftRadius: 2, alignSelf: 'flex-start', border: '1px solid #c7d2fe' },
  bubbleHeader: { display: 'flex', gap: '0.5rem', alignItems: 'center', marginBottom: 3 },
  sender: { fontWeight: 600, fontSize: '0.75rem', color: '#374151' },
  time: { fontSize: '0.7rem', color: '#9ca3af' },
  bubbleText: { fontSize: '0.875rem', lineHeight: 1.5 },
  compose: { display: 'flex', gap: '0.5rem', alignItems: 'flex-end' },
  textarea: { flex: 1, padding: '0.55rem 0.75rem', border: '1px solid #d1d5db', borderRadius: 7, fontSize: '0.9rem', resize: 'vertical' },
  sendBtn: { padding: '0.55rem 1rem', background: '#1a5c38', color: '#fff', border: 'none', borderRadius: 7, cursor: 'pointer', fontWeight: 600, fontSize: '0.875rem', whiteSpace: 'nowrap' },
}
