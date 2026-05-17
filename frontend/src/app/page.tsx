import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

/**
 * Dashboard home page displaying key protocol metrics.
 */
export default function Home() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">
          Overview of the staking protocol metrics and your positions.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Staked</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">$1,234,567</div>
            <p className="text-xs text-muted-foreground">+12% from last month</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">APY</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">8.42%</div>
            <p className="text-xs text-muted-foreground">Variable rate</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Your Stake</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">0.00</div>
            <p className="text-xs text-muted-foreground">Connect wallet to view</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Rewards</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">0.00</div>
            <p className="text-xs text-muted-foreground">Accrued this period</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Staking Pool</CardTitle>
            <CardDescription>
              Deposit tokens to start earning rewards.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Navigate to the Staking page to deposit or withdraw tokens from the pool.
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Rewards</CardTitle>
            <CardDescription>
              Claim your earned staking rewards.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Rewards accrue block-by-block and can be claimed at any time without penalties.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
