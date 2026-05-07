import { prisma } from './db'

export type AdminAction =
  | 'admin_balance_adjust'
  | 'admin_user_freeze'
  | 'admin_user_unfreeze'
  | 'admin_grant_admin'
  | 'admin_revoke_admin'
  | 'admin_mark_established'
  | 'admin_user_edit'
  | 'admin_item_create'
  | 'admin_item_edit'
  | 'admin_item_mint'
  | 'admin_item_approve'
  | 'admin_item_reject'
  | 'admin_item_freeze'
  | 'admin_item_unfreeze'
  | 'admin_auction_activate'
  | 'admin_auction_edit'
  | 'admin_auction_cancel'
  | 'admin_auction_reverse'
  | 'admin_cron_run'
  | 'admin_report_dismiss'
  | 'admin_report_freeze_edition'
  | 'admin_job_auction_create'
  | 'admin_job_auction_cancel'
  | 'admin_job_holding_terminate'
  | 'admin_user_delete'
  | 'admin_blacklist_add'
  | 'admin_blacklist_remove'
  | 'suggestion_approve'
  | 'suggestion_reject'

export const DESTRUCTIVE_ACTIONS: AdminAction[] = [
  'admin_user_freeze',
  'admin_item_freeze',
  'admin_auction_cancel',
  'admin_auction_reverse',
  'admin_balance_adjust',
]

export function isDestructive(action: AdminAction): boolean {
  return DESTRUCTIVE_ACTIONS.includes(action)
}

interface LogParams {
  adminUserId: string
  action:      AdminAction
  targetType?: 'user' | 'item' | 'auction' | 'cron' | 'suggestion'
  targetId?:   string
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  before?:     Record<string, any> | null
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  after?:      Record<string, any> | null
  reason?:     string
}

type TxClient = Omit<typeof prisma, '$connect' | '$disconnect' | '$on' | '$use' | '$extends'>

export async function logAdminAction(params: LogParams, tx?: TxClient): Promise<void> {
  const db = tx ?? prisma
  await db.adminLog.create({
    data: {
      adminUserId: params.adminUserId,
      action:      params.action,
      targetType:  params.targetType ?? null,
      targetId:    params.targetId   ?? null,
      beforeJson:  params.before     ?? undefined,
      afterJson:   params.after      ?? undefined,
      reason:      params.reason     ?? null,
    },
  })
}
