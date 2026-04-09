import React, { useState } from "react";
import { 
  Area, AreaChart, Bar, BarChart, CartesianGrid, Line, LineChart, 
  ResponsiveContainer, Tooltip as RechartsTooltip, XAxis, YAxis 
} from "recharts";
import { 
  ArrowDownIcon, ArrowUpIcon, ActivityIcon, UsersIcon, 
  MousePointerClickIcon, CreditCardIcon, RefreshCwIcon,
  SearchIcon, BellIcon, MenuIcon, ChevronDownIcon,
  LayoutDashboardIcon, SettingsIcon, BarChart3Icon
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../ui/card";
import { Button } from "../../ui/button";
import { Badge } from "../../ui/badge";
import { Separator } from "../../ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "../../ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../ui/select";

// --- Data ---
const revenueData = [
  { month: "Jan", revenue: 24000, expenses: 18000 },
  { month: "Feb", revenue: 28000, expenses: 19000 },
  { month: "Mar", revenue: 32000, expenses: 20000 },
  { month: "Apr", revenue: 30000, expenses: 21000 },
  { month: "May", revenue: 36000, expenses: 22000 },
  { month: "Jun", revenue: 41000, expenses: 23000 },
  { month: "Jul", revenue: 47200, expenses: 24000 },
];

const userGrowthData = [
  { day: "Mon", newUsers: 120, churned: 20 },
  { day: "Tue", newUsers: 132, churned: 15 },
  { day: "Wed", newUsers: 145, churned: 25 },
  { day: "Thu", newUsers: 160, churned: 10 },
  { day: "Fri", newUsers: 180, churned: 30 },
  { day: "Sat", newUsers: 210, churned: 15 },
  { day: "Sun", newUsers: 250, churned: 10 },
];

const engagementData = [
  { time: "00:00", active: 1200 },
  { time: "04:00", active: 800 },
  { time: "08:00", active: 3200 },
  { time: "12:00", active: 5400 },
  { time: "16:00", active: 6100 },
  { time: "20:00", active: 4800 },
  { time: "24:00", active: 2100 },
];

const recentActivity = [
  { id: 1, type: "signup", user: "alex@example.com", time: "2 mins ago", plan: "Pro" },
  { id: 2, type: "upgrade", user: "sarah@design.co", time: "15 mins ago", plan: "Enterprise" },
  { id: 3, type: "churn", user: "mike@startup.io", time: "1 hour ago", plan: "Basic" },
  { id: 4, type: "signup", user: "jessica@tech.net", time: "3 hours ago", plan: "Pro" },
  { id: 5, type: "downgrade", user: "tom@dev.org", time: "5 hours ago", plan: "Basic" },
];

// --- Sub-components ---
function MetricCard({ 
  title, 
  value, 
  trend, 
  trendLabel, 
  icon: Icon, 
  isPositive 
}: { 
  title: string; 
  value: string; 
  trend: string; 
  trendLabel: string;
  icon: React.ElementType;
  isPositive: boolean;
}) {
  return (
    <Card className="border-border/50 bg-background/50 shadow-sm transition-all hover:bg-background/80 hover:shadow-md">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        <div className="rounded-full bg-secondary/50 p-2">
          <Icon className="h-4 w-4 text-primary/70" />
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-semibold tracking-tight">{value}</div>
        <div className="mt-1 flex items-center text-xs">
          <span className={`flex items-center font-medium ${isPositive ? 'text-emerald-500' : 'text-rose-500'}`}>
            {isPositive ? <ArrowUpIcon className="mr-1 h-3 w-3" /> : <ArrowDownIcon className="mr-1 h-3 w-3" />}
            {trend}
          </span>
          <span className="ml-2 text-muted-foreground">{trendLabel}</span>
        </div>
      </CardContent>
    </Card>
  );
}

export function Dashboard() {
  const [timeRange, setTimeRange] = useState("30d");

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950 font-sans text-foreground selection:bg-primary/20">
      {/* Sidebar / Top Nav (Simplified for dashboard view) */}
      <header className="sticky top-0 z-30 flex h-14 items-center gap-4 border-b border-border/40 bg-background/95 px-6 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="flex items-center gap-2 font-semibold tracking-tight text-primary">
          <div className="flex h-6 w-6 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <ActivityIcon className="h-4 w-4" />
          </div>
          <span>Nexus Analytics</span>
        </div>
        
        <nav className="hidden md:flex items-center gap-6 ml-6 text-sm font-medium text-muted-foreground">
          <a href="#" className="text-foreground transition-colors hover:text-foreground">Overview</a>
          <a href="#" className="transition-colors hover:text-foreground">Revenue</a>
          <a href="#" className="transition-colors hover:text-foreground">Users</a>
          <a href="#" className="transition-colors hover:text-foreground">Settings</a>
        </nav>

        <div className="ml-auto flex items-center space-x-4">
          <div className="relative hidden md:block">
            <SearchIcon className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <input
              type="search"
              placeholder="Search metrics..."
              className="h-9 w-64 rounded-md border border-input bg-transparent pl-9 pr-4 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            />
          </div>
          <Button variant="ghost" size="icon" className="h-9 w-9 text-muted-foreground">
            <BellIcon className="h-4 w-4" />
          </Button>
          <Separator orientation="vertical" className="h-5" />
          <Button variant="ghost" className="relative h-8 w-8 rounded-full">
            <Avatar className="h-8 w-8 border border-border/50">
              <AvatarImage src="https://i.pravatar.cc/150?u=a042581f4e29026704d" alt="User" />
              <AvatarFallback>AD</AvatarFallback>
            </Avatar>
          </Button>
        </div>
      </header>

      <main className="flex-1 space-y-6 p-6 md:p-8 pt-6 max-w-[1600px] mx-auto">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight">Dashboard</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Your startup performance at a glance.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Select value={timeRange} onValueChange={setTimeRange}>
              <SelectTrigger className="w-[140px] h-9 text-xs font-medium">
                <SelectValue placeholder="Select range" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7d">Last 7 days</SelectItem>
                <SelectItem value="30d">Last 30 days</SelectItem>
                <SelectItem value="90d">Last 90 days</SelectItem>
                <SelectItem value="12m">Last 12 months</SelectItem>
              </SelectContent>
            </Select>
            <Button size="sm" className="h-9 gap-2">
              <RefreshCwIcon className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Refresh Data</span>
            </Button>
          </div>
        </div>

        {/* Top Metrics Row */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <MetricCard 
            title="Monthly Recurring Revenue" 
            value="$47,200" 
            trend="12.5%" 
            trendLabel="vs last month"
            icon={CreditCardIcon}
            isPositive={true}
          />
          <MetricCard 
            title="Total Users" 
            value="8,241" 
            trend="4.3%" 
            trendLabel="vs last month"
            icon={UsersIcon}
            isPositive={true}
          />
          <MetricCard 
            title="DAU / MAU Ratio" 
            value="73%" 
            trend="2.1%" 
            trendLabel="vs last month"
            icon={MousePointerClickIcon}
            isPositive={true}
          />
          <MetricCard 
            title="Net Churn Rate" 
            value="1.2%" 
            trend="0.4%" 
            trendLabel="vs last month"
            icon={ActivityIcon}
            isPositive={false}
          />
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
          {/* Revenue Chart */}
          <Card className="col-span-1 lg:col-span-4 border-border/50 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <div className="space-y-1">
                <CardTitle className="text-base font-medium">Revenue Growth</CardTitle>
                <CardDescription className="text-xs">MRR and Expenses over time</CardDescription>
              </div>
            </CardHeader>
            <CardContent>
              <div className="h-[300px] w-full mt-4">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={revenueData} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="colorExpenses" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(var(--muted-foreground))" stopOpacity={0.1}/>
                        <stop offset="95%" stopColor="hsl(var(--muted-foreground))" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" opacity={0.5} />
                    <XAxis 
                      dataKey="month" 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }} 
                      dy={10}
                    />
                    <YAxis 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
                      tickFormatter={(value) => `$${value / 1000}k`}
                      dx={-10}
                    />
                    <RechartsTooltip 
                      contentStyle={{ 
                        backgroundColor: 'hsl(var(--background))', 
                        borderColor: 'hsl(var(--border))',
                        borderRadius: 'var(--radius)',
                        boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
                      }}
                      itemStyle={{ color: 'hsl(var(--foreground))', fontSize: '13px' }}
                      labelStyle={{ color: 'hsl(var(--muted-foreground))', fontSize: '12px', marginBottom: '4px' }}
                    />
                    <Area 
                      type="monotone" 
                      dataKey="expenses" 
                      stroke="hsl(var(--muted-foreground))" 
                      strokeWidth={2}
                      fillOpacity={1} 
                      fill="url(#colorExpenses)" 
                      name="Expenses"
                    />
                    <Area 
                      type="monotone" 
                      dataKey="revenue" 
                      stroke="hsl(var(--primary))" 
                      strokeWidth={2}
                      fillOpacity={1} 
                      fill="url(#colorRevenue)" 
                      name="MRR"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* User Growth Chart */}
          <Card className="col-span-1 lg:col-span-3 border-border/50 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <div className="space-y-1">
                <CardTitle className="text-base font-medium">User Acquisition</CardTitle>
                <CardDescription className="text-xs">New signups vs churn (7d)</CardDescription>
              </div>
            </CardHeader>
            <CardContent>
              <div className="h-[300px] w-full mt-4">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={userGrowthData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" opacity={0.5} />
                    <XAxis 
                      dataKey="day" 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }} 
                      dy={10}
                    />
                    <YAxis 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
                    />
                    <RechartsTooltip
                      cursor={{ fill: 'hsl(var(--muted))', opacity: 0.4 }}
                      contentStyle={{ 
                        backgroundColor: 'hsl(var(--background))', 
                        borderColor: 'hsl(var(--border))',
                        borderRadius: 'var(--radius)',
                        boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
                      }}
                    />
                    <Bar dataKey="newUsers" name="New Users" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} barSize={20} />
                    <Bar dataKey="churned" name="Churned" fill="hsl(var(--destructive))" radius={[4, 4, 0, 0]} barSize={20} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {/* Engagement Chart */}
          <Card className="col-span-1 lg:col-span-2 border-border/50 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <div className="space-y-1">
                <CardTitle className="text-base font-medium">Active Users (24h)</CardTitle>
                <CardDescription className="text-xs">Real-time engagement curve</CardDescription>
              </div>
            </CardHeader>
            <CardContent>
              <div className="h-[250px] w-full mt-4">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={engagementData} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" opacity={0.5} />
                    <XAxis 
                      dataKey="time" 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }} 
                      dy={10}
                    />
                    <YAxis 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
                      dx={-10}
                    />
                    <RechartsTooltip
                      contentStyle={{ 
                        backgroundColor: 'hsl(var(--background))', 
                        borderColor: 'hsl(var(--border))',
                        borderRadius: 'var(--radius)'
                      }}
                    />
                    <Line 
                      type="smooth" 
                      dataKey="active" 
                      stroke="hsl(var(--primary))" 
                      strokeWidth={3} 
                      dot={false}
                      activeDot={{ r: 6, fill: "hsl(var(--primary))", stroke: "hsl(var(--background))", strokeWidth: 2 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Recent Activity List */}
          <Card className="col-span-1 border-border/50 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <div className="space-y-1">
                <CardTitle className="text-base font-medium">Recent Activity</CardTitle>
                <CardDescription className="text-xs">Latest customer events</CardDescription>
              </div>
            </CardHeader>
            <CardContent className="pt-4">
              <div className="space-y-5">
                {recentActivity.map((activity) => (
                  <div key={activity.id} className="flex items-center">
                    <Avatar className="h-9 w-9">
                      <AvatarFallback className={
                        activity.type === 'signup' ? 'bg-primary/10 text-primary' :
                        activity.type === 'upgrade' ? 'bg-emerald-500/10 text-emerald-500' :
                        activity.type === 'churn' ? 'bg-rose-500/10 text-rose-500' :
                        'bg-muted text-muted-foreground'
                      }>
                        {activity.user.substring(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="ml-4 space-y-1">
                      <p className="text-sm font-medium leading-none">{activity.user}</p>
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        {activity.type === 'signup' && 'Signed up for'}
                        {activity.type === 'upgrade' && 'Upgraded to'}
                        {activity.type === 'downgrade' && 'Downgraded to'}
                        {activity.type === 'churn' && 'Churned from'}
                        <Badge variant="outline" className="h-4 text-[10px] px-1 font-normal uppercase tracking-wider">
                          {activity.plan}
                        </Badge>
                      </p>
                    </div>
                    <div className="ml-auto font-medium text-xs text-muted-foreground">
                      {activity.time}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
