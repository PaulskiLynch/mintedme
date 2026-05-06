import Link from 'next/link'
import ItemForm from '../ItemForm'

export default function NewItemPage() {
  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <Link href="/admin/items" style={{ color: 'var(--muted)', fontSize: 13 }}>← Items</Link>
      </div>
      <div style={{ fontSize: 22, fontWeight: 900, marginBottom: 28 }}>Create Item</div>
      <ItemForm />
    </div>
  )
}
