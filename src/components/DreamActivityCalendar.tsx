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
    const oneYearAgo = new Date(today.getFullYear() - 1, today.getMonth(), today.getDate());
    const calendar = [];

    for (let d = new Date(oneYearAgo); d <= today; d.setDate(d.getDate() + 1)) {
      const dateStr = d.toISOString().split('T')[0];
      const count = activityData[dateStr] || 0;
      calendar.push({
        date: dateStr,
        count,
        level: getActivityLevel(count)
      });
    }

    return calendar;
  };

  const getMonthLabels = () => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Maj', 'Jun', 
                   'Jul', 'Avg', 'Sep', 'Okt', 'Nov', 'Dec'];
    const today = new Date();
    const labels = [];
    
    for (let i = 0; i < 12; i++) {
      const month = new Date(today.getFullYear(), today.getMonth() - 11 + i, 1);
      labels.push(months[month.getMonth()]);
    }
    
    return labels;
  };

  if (loading) {
    return (
      <Card className="border-border/50">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            Aktivnost sanj
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-24 bg-muted/20 rounded animate-pulse"></div>
        </CardContent>
      </Card>
    );
  }

  const calendarData = generateCalendarData();
  const monthLabels = getMonthLabels();
  const weeksData: any[][] = [];

  // Group calendar data by weeks (7 days)
  for (let i = 0; i < calendarData.length; i += 7) {
    weeksData.push(calendarData.slice(i, i + 7));
  }

  return (
    <Card className="border-border/50">
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Calendar className="h-4 w-4" />
          Aktivnost sanj
        </CardTitle>
      </CardHeader>
      <CardContent className="p-3">
        <div className="space-y-1">
          {/* Month labels */}
          <div className="flex justify-between text-xs text-muted-foreground mb-2">
            {monthLabels.map((month, index) => (
              <span key={index} className="w-8 text-center">{month}</span>
            ))}
          </div>

          {/* Day labels */}
          <div className="flex items-start gap-1">
            <div className="flex flex-col gap-1 text-xs text-muted-foreground mt-1">
              <div className="h-2"></div>
              <div>Pon</div>
              <div className="h-2"></div>
              <div>Sre</div>
              <div className="h-2"></div>
              <div>Pet</div>
              <div className="h-2"></div>
            </div>

            {/* Calendar grid */}
            <div className="grid grid-cols-53 gap-[1px] ml-2">
              {calendarData.map((day) => (
                <div
                  key={day.date}
                  className={`w-2 h-2 rounded-sm ${day.level} transition-colors cursor-pointer`}
                  title={`${day.date}: ${day.count} ${day.count === 1 ? 'sanja' : 'sanj'}`}
                />
              ))}
            </div>
          </div>

          {/* Legend */}
          <div className="flex items-center justify-between mt-3 text-xs text-muted-foreground">
            <span>Manj</span>
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-sm bg-muted/30"></div>
              <div className="w-2 h-2 rounded-sm bg-emerald-200 dark:bg-emerald-900"></div>
              <div className="w-2 h-2 rounded-sm bg-emerald-300 dark:bg-emerald-800"></div>
              <div className="w-2 h-2 rounded-sm bg-emerald-500 dark:bg-emerald-700"></div>
            </div>
            <span>Več</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default DreamActivityCalendar;