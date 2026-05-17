import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

/**
 * Rewards page for viewing and claiming earned rewards.
 */
export default function RewardsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Rewards</h1>
        <p className="text-muted-foreground">
          Track and claim your staking rewards.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Claim Rewards</CardTitle>
            <CardDescription>
              Withdraw your accrued rewards to your wallet.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Rewards accrue block-by-block and can be claimed at any time.
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Reward History</CardTitle>
            <CardDescription>
              View your past reward claims and earnings.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Historical reward data will be displayed here.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
