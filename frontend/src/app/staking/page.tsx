import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

/**
 * Staking page for depositing and withdrawing tokens.
 */
export default function StakingPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Staking</h1>
        <p className="text-muted-foreground">
          Manage your staking positions and deposit tokens into the pool.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Deposit</CardTitle>
            <CardDescription>
              Stake tokens to start earning rewards.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Connect your wallet to deposit tokens into the staking pool.
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Withdraw</CardTitle>
            <CardDescription>
              Remove your staked tokens from the pool.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Withdrawals are processed immediately with no lock-up period.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
