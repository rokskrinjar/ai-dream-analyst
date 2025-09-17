import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { Calendar } from 'lucide-react';

interface DreamActivityData {
  [date: string]: number;
}

const DreamActivityCalendar = () => {
  const [activityData, setActivityData] = useState<DreamActivityData>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDreamActivity();
  }, []);

  const fetchDreamActivity = async () => {
    try {
      const { data, error } = await supabase
        .from('dreams')
        .select('dream_date')
        .order('dream_date', { ascending: true });

      if (error) throw error;

      // Process data into activity counts
      const activity: DreamActivityData = {};
      (data || []).forEach(dream => {
        const date = dream.dream_date;
        activity[date] = (activity[date] || 0) + 1;
      });

      console.log('Dream activity data:', activity);
      console.log('Total dreams found:', data?.length);
      setActivityData(activity);
    } catch (error) {
      console.error('Error fetching dream activity:', error);
    } finally {
      setLoading(false);
    }
  };

  const getActivityLevel = (count: number): string => {
    if (count === 0) return 'bg-muted/20';
    if (count === 1) return 'bg-emerald-100 dark:bg-emerald-900/40';
    if (count === 2) return 'bg-emerald-200 dark:bg-emerald-800/60';
    if (count >= 3) return 'bg-emerald-400 dark:bg-emerald-600';
    return 'bg-muted/20';
  };

  const generateCalendarData = () => {
    const today = new Date();
    const startDate = new Date(today.getFullYear() - 1, today.getMonth(), today.getDate());
    
    // Find the Monday of the week containing startDate
    const startDayOfWeek = startDate.getDay();
    const mondayOffset = startDayOfWeek === 0 ? 6 : startDayOfWeek - 1;
    const mondayStart = new Date(startDate);
    mondayStart.setDate(startDate.getDate() - mondayOffset);
    
    // Generate weeks data
    const weeks = [];
    let currentDate = new Date(mondayStart);
    
    while (currentDate <= today) {
      const week = [];
      for (let i = 0; i < 7; i++) {
        const dateStr = currentDate.toISOString().split('T')[0];
        const count = activityData[dateStr] || 0;
        const isInRange = currentDate >= startDate && currentDate <= today;
        
        week.push({
          date: dateStr,
          count: isInRange ? count : 0,
          level: isInRange ? getActivityLevel(count) : 'bg-transparent',
          isInRange
        });
        
        currentDate.setDate(currentDate.getDate() + 1);
      }
      weeks.push(week);
    }
    
    return weeks;
  };

  const getMonthLabels = (weeks: any[][]) => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Maj', 'Jun', 
                   'Jul', 'Avg', 'Sep', 'Okt', 'Nov', 'Dec'];
    const labels: { [key: number]: string } = {};
    let lastMonth = -1;
    
    weeks.forEach((week, weekIndex) => {
      if (week.length > 0) {
        const firstDay = new Date(week[0].date);
        const currentMonth = firstDay.getMonth();
        
        // Show month label when month changes and there's enough space (at least 3 weeks visible)
        if (currentMonth !== lastMonth && weekIndex > 0) {
          // Only show if we have at least 3 weeks of the month visible
          const remainingWeeks = weeks.length - weekIndex;
          const monthWeeksCount = weeks.slice(weekIndex).filter((w, i) => {
            if (w.length === 0) return false;
            const wDate = new Date(w[0].date);
            return wDate.getMonth() === currentMonth;
          }).length;
          
          if (monthWeeksCount >= 2) {
            labels[weekIndex] = months[currentMonth];
          }
          lastMonth = currentMonth;
        } else if (weekIndex === 0) {
          labels[weekIndex] = months[currentMonth];
          lastMonth = currentMonth;
        }
      }
    });
    
    return labels;
  };

  if (loading) {
    return (
      <div className="bg-card border border-border/50 rounded-lg p-6">
        <div className="flex items-center gap-3 mb-4">
          <Calendar className="h-5 w-5 text-muted-foreground" />
          <h2 className="text-lg font-semibold">Aktivnost sanj</h2>
        </div>
        <div className="h-32 bg-muted/20 rounded animate-pulse"></div>
      </div>
    );
  }

  const weeksData = generateCalendarData();
  const monthLabels = getMonthLabels(weeksData);

  return (
    <div className="bg-card border border-border/50 rounded-lg p-6">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Calendar className="h-5 w-5 text-muted-foreground" />
        <div>
          <h2 className="text-lg font-semibold">Aktivnost sanj</h2>
          <p className="text-sm text-muted-foreground">
            {Object.values(activityData).reduce((a, b) => a + b, 0)} sanj v zadnjem letu
          </p>
        </div>
      </div>

      <div className="space-y-4">
        {/* Month labels */}
        <div className="flex text-xs text-muted-foreground ml-8">
          {weeksData.map((week, weekIndex) => (
            <div key={weekIndex} className="flex-1 text-left">
              {monthLabels[weekIndex] && (
                <span className="text-xs font-medium">{monthLabels[weekIndex]}</span>
              )}
            </div>
          ))}
        </div>

        {/* Day labels and calendar grid */}
        <div className="flex items-start gap-3">
          <div className="flex flex-col text-xs text-muted-foreground space-y-1 pt-1">
            <div className="h-3 flex items-center justify-end pr-1 font-medium">P</div>
            <div className="h-3 flex items-center justify-end pr-1 font-medium">T</div>
            <div className="h-3 flex items-center justify-end pr-1 font-medium">S</div>
            <div className="h-3 flex items-center justify-end pr-1 font-medium">Č</div>
            <div className="h-3 flex items-center justify-end pr-1 font-medium">P</div>
            <div className="h-3 flex items-center justify-end pr-1 font-medium">S</div>
            <div className="h-3 flex items-center justify-end pr-1 font-medium">N</div>
          </div>

          {/* Weekly calendar grid */}
          <div className="flex gap-1 flex-1">
            {weeksData.map((week, weekIndex) => (
              <div key={weekIndex} className="flex flex-col gap-1 flex-1">
                {week.map((day) => (
                  <div
                    key={day.date}
                    className={`w-full h-3 rounded-sm ${day.level} transition-all duration-150 hover:ring-2 hover:ring-offset-1 hover:ring-primary/30 cursor-pointer`}
                    title={`${new Date(day.date).toLocaleDateString('sl-SI')}: ${day.count} ${day.count === 1 ? 'sanja' : 'sanj'}`}
                  />
                ))}
              </div>
            ))}
          </div>
        </div>

        {/* Legend */}
        <div className="flex items-center justify-between text-xs text-muted-foreground ml-8">
          <span className="font-medium">Manj</span>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded-sm bg-muted/20"></div>
            <div className="w-3 h-3 rounded-sm bg-emerald-100 dark:bg-emerald-900/40"></div>
            <div className="w-3 h-3 rounded-sm bg-emerald-200 dark:bg-emerald-800/60"></div>
            <div className="w-3 h-3 rounded-sm bg-emerald-400 dark:bg-emerald-600"></div>
          </div>
          <span className="font-medium">Več</span>
        </div>
      </div>
    </div>
  );
};

export default DreamActivityCalendar;