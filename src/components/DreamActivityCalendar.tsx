import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { Calendar } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';

interface DreamActivityData {
  [date: string]: number;
}

const DreamActivityCalendar = () => {
  const [activityData, setActivityData] = useState<DreamActivityData>({});
  const [loading, setLoading] = useState(true);
  const isMobile = useIsMobile();

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
      console.log('Individual dream dates:', data?.map(d => d.dream_date));
      setActivityData(activity);
    } catch (error) {
      console.error('Error fetching dream activity:', error);
    } finally {
      setLoading(false);
    }
  };

  const getActivityLevel = (count: number): string => {
    if (count === 0) return 'bg-muted';
    if (count === 1) return 'bg-primary/20';
    if (count === 2) return 'bg-primary/50';
    if (count >= 3) return 'bg-primary';
    return 'bg-muted';
  };

  // Generate calendar data for the past year (desktop/tablet)
  const generateCalendarData = () => {
    const today = new Date();
    today.setHours(23, 59, 59, 999); // End of today to include full day
    
    const startDate = new Date(today.getFullYear() - 1, today.getMonth(), today.getDate());
    startDate.setHours(0, 0, 0, 0); // Start of day
    
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
        const currentDateOnly = new Date(currentDate);
        currentDateOnly.setHours(0, 0, 0, 0);
        
        // Use local date formatting instead of UTC to match database format
        const dateStr = currentDate.toLocaleDateString('sv-SE'); // YYYY-MM-DD in local time
        const count = activityData[dateStr] || 0;
        
        // Debug logging for Sept 17th specifically
        if (dateStr === '2025-09-17') {
          console.log('Sept 17 debug - dateStr:', dateStr, 'count from activityData:', count, 'available keys:', Object.keys(activityData));
        }
        
        // Check if date is within our year range
        const isInRange = currentDateOnly >= startDate && currentDateOnly <= today;
        const activityLevel = isInRange ? getActivityLevel(count) : 'bg-transparent';
        
        week.push({
          date: dateStr,
          count: isInRange ? count : 0,
          level: activityLevel,
          isInRange
        });
        
        currentDate.setDate(currentDate.getDate() + 1);
      }
      weeks.push(week);
    }
    
    return weeks;
  };

  // Generate calendar data for the past 30 days (mobile)
  const generateMobileCalendarData = () => {
    const today = new Date();
    today.setHours(23, 59, 59, 999); // End of today to include full day
    
    const thirtyDaysAgo = new Date(today.getTime() - (30 * 24 * 60 * 60 * 1000));
    thirtyDaysAgo.setHours(0, 0, 0, 0); // Start of day
    
    // Find the Monday of the week containing 30 days ago
    const startDayOfWeek = thirtyDaysAgo.getDay();
    const mondayOffset = startDayOfWeek === 0 ? 6 : startDayOfWeek - 1;
    const mondayStart = new Date(thirtyDaysAgo);
    mondayStart.setDate(thirtyDaysAgo.getDate() - mondayOffset);
    
    // Generate weeks data
    const weeks = [];
    let currentDate = new Date(mondayStart);
    
    while (currentDate <= today) {
      const week = [];
      for (let i = 0; i < 7; i++) {
        const currentDateOnly = new Date(currentDate);
        currentDateOnly.setHours(0, 0, 0, 0);
        
        // Use local date formatting instead of UTC to match database format
        const dateStr = currentDate.toLocaleDateString('sv-SE'); // YYYY-MM-DD in local time
        const count = activityData[dateStr] || 0;
        
        // Check if date is within our 30-day range
        const isInRange = currentDateOnly >= thirtyDaysAgo && currentDateOnly <= today;
        const activityLevel = isInRange ? getActivityLevel(count) : 'bg-transparent';
        
        week.push({
          date: dateStr,
          count: isInRange ? count : 0,
          level: activityLevel,
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

  // Memoized calendar generation - only runs when activityData changes and has data
  const weeksData = useMemo(() => {
    // Don't generate calendar if we're loading or have no data
    if (loading || Object.keys(activityData).length === 0) {
      console.log('Calendar generation skipped - loading:', loading, 'data keys:', Object.keys(activityData).length);
      return [];
    }
    
    // Validate we have the expected data for Sep 17th
    const hasSep17 = activityData['2025-09-17'];
    console.log('Calendar generation with data:', activityData, 'Sep 17 count:', hasSep17);
    
    return isMobile ? generateMobileCalendarData() : generateCalendarData();
  }, [activityData, loading, isMobile]);

  const monthLabels = useMemo(() => {
    if (weeksData.length === 0) return {};
    return getMonthLabels(weeksData);
  }, [weeksData]);

  // Show loading state - only check loading, not weeksData.length to avoid initialization issues
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

  // If no data loaded, show empty state
  if (weeksData.length === 0) {
    return (
      <div className="bg-card border border-border/50 rounded-lg p-6">
        <div className="flex items-center gap-3 mb-4">
          <Calendar className="h-5 w-5 text-muted-foreground" />
          <h2 className="text-lg font-semibold">Aktivnost sanj</h2>
        </div>
        <div className="h-32 flex items-center justify-center text-muted-foreground">
          Ni podatkov o sanjah
        </div>
      </div>
    );
  }

  return (
    <div className="bg-card border border-border/50 rounded-lg p-6">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Calendar className="h-5 w-5 text-muted-foreground" />
        <div>
          <h2 className="text-lg font-semibold">Aktivnost sanj</h2>
          <p className="text-sm text-muted-foreground">
            {Object.values(activityData).reduce((a, b) => a + b, 0)} sanj v {isMobile ? 'zadnjih 30 dneh' : 'zadnjem letu'}
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
            <div className="w-3 h-3 rounded-sm bg-muted"></div>
            <div className="w-3 h-3 rounded-sm bg-primary/20"></div>
            <div className="w-3 h-3 rounded-sm bg-primary/50"></div>
            <div className="w-3 h-3 rounded-sm bg-primary"></div>
          </div>
          <span className="font-medium">Več</span>
        </div>
      </div>
    </div>
  );
};

export { DreamActivityCalendar };