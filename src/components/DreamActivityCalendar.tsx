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

      setActivityData(activity);
    } catch (error) {
      console.error('Error fetching dream activity:', error);
    } finally {
      setLoading(false);
    }
  };

  const getActivityLevel = (count: number): string => {
    if (count === 0) return 'bg-muted/30';
    if (count === 1) return 'bg-emerald-200 dark:bg-emerald-900';
    if (count === 2) return 'bg-emerald-300 dark:bg-emerald-800';
    if (count >= 3) return 'bg-emerald-500 dark:bg-emerald-700';
    return 'bg-muted/30';
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
    const labels = [];
    
    // Get first day of each week to determine month positions
    weeks.forEach((week, weekIndex) => {
      if (week.length > 0) {
        const firstDay = new Date(week[0].date);
        const weekStart = firstDay.getDate();
        
        // Only show month label if it's the first week of month or first few weeks
        if (weekStart <= 7 || weekIndex === 0) {
          labels[weekIndex] = months[firstDay.getMonth()];
        }
      }
    });
    
    return labels;
  };

  if (loading) {
    return (
      <Card className="border-border/50">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Calendar className="h-3 w-3" />
            Aktivnost sanj
          </CardTitle>
        </CardHeader>
        <CardContent className="p-2">
          <div className="h-16 bg-muted/20 rounded animate-pulse"></div>
        </CardContent>
      </Card>
    );
  }

  const weeksData = generateCalendarData();
  const monthLabels = getMonthLabels(weeksData);

  return (
    <Card className="border-border/50">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <Calendar className="h-3 w-3" />
          Aktivnost sanj
        </CardTitle>
      </CardHeader>
      <CardContent className="p-2">
        <div className="space-y-1">
          {/* Month labels */}
          <div className="flex text-[10px] text-muted-foreground mb-1">
            {monthLabels.map((month, index) => (
              <span key={index} className="w-3 text-left">{month}</span>
            ))}
          </div>

          {/* Day labels and calendar grid */}
          <div className="flex items-start gap-1">
            <div className="flex flex-col text-[9px] text-muted-foreground mr-1">
              <div className="h-1"></div>
              <div className="h-1.5">P</div>
              <div className="h-1.5"></div>
              <div className="h-1.5">S</div>
              <div className="h-1.5"></div>
              <div className="h-1.5">P</div>
              <div className="h-1.5"></div>
            </div>

            {/* Weekly calendar grid */}
            <div className="flex gap-[1px]">
              {weeksData.map((week, weekIndex) => (
                <div key={weekIndex} className="flex flex-col gap-[1px]">
                  {week.map((day) => (
                    <div
                      key={day.date}
                      className={`w-1.5 h-1.5 rounded-[1px] ${day.level} transition-colors cursor-pointer`}
                      title={`${day.date}: ${day.count} ${day.count === 1 ? 'sanja' : 'sanj'}`}
                    />
                  ))}
                </div>
              ))}
            </div>
          </div>

          {/* Legend */}
          <div className="flex items-center justify-between mt-2 text-[9px] text-muted-foreground">
            <span>Manj</span>
            <div className="flex items-center gap-[1px]">
              <div className="w-1.5 h-1.5 rounded-[1px] bg-muted/30"></div>
              <div className="w-1.5 h-1.5 rounded-[1px] bg-emerald-200 dark:bg-emerald-900"></div>
              <div className="w-1.5 h-1.5 rounded-[1px] bg-emerald-300 dark:bg-emerald-800"></div>
              <div className="w-1.5 h-1.5 rounded-[1px] bg-emerald-500 dark:bg-emerald-700"></div>
            </div>
            <span>Več</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default DreamActivityCalendar;