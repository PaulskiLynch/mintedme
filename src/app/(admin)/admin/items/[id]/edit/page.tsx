import { notFound } from 'next/navigation'
import Link from 'next/link'
import { prisma } from '@/lib/db'
import ItemForm from '../../ItemForm'

export const dynamic = 'force-dynamic'

export default async function EditItemPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const item = await prisma.item.findUnique({ where: { id } })
  if (!item) notFound()

  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <Link href="/admin/items" style={{ color: 'var(--muted)', fontSize: 13 }}>← Items</Link>
      </div>
      <div style={{ fontSize: 22, fontWeight: 900, marginBottom: 4 }}>Edit Item</div>
      <div style={{ color: 'var(--muted)', fontSize: 13, marginBottom: 28 }}>{item.name}</div>
      <ItemForm
        isEdit
        initial={{
          id:              item.id,
          name:            item.name,
          inspirationName: item.inspirationName ?? '',
          description:     item.description     ?? '',
          category:        item.category,
          rarityTier:      item.rarityTier,
          imageUrl:        item.imageUrl         ?? '',
          totalSupply:     item.totalSupply,
          benchmarkPrice:  Number(item.benchmarkPrice),
          horsepower:      item.horsepower?.toString()      ?? '',
          topSpeed:        item.topSpeed?.toString()        ?? '',
          zeroToHundred:   item.zeroToHundred?.toString()   ?? '',
          businessType:    item.businessType                ?? '',
          businessRiskTier:item.businessRiskTier            ?? 'safe',
          propertyTier:    item.propertyTier               ?? '',
          aircraftType:    item.aircraftType               ?? '',
          itemStatus:      item.itemStatus                 ?? 'active',
          isOfficial:      item.isOfficial,
          isApproved:      item.isApproved,
          isFrozen:        item.isFrozen,
        }}
      />
    </div>
  )
}
