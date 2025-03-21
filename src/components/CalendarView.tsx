import React, { useState, useEffect, useRef } from 'react';
import { Employee } from '../types';
import { supabase } from '../lib/supabase';

// Calendar events interface
interface CalendarEvent {
  id: string;
  title: string;
  date: Date;
  event_type: 'holiday' | 'event' | 'reminder';
  employee_id?: string;
  employeeName?: string;
  color?: string;
  is_holiday?: boolean;
  is_trinidad_holiday?: boolean;
  year?: number;
}

// Form data for the add event modal
interface EventFormData {
  title: string;
  date: string;
  time: string;
  type: 'event' | 'reminder';
  employeeId: string;
}

interface CalendarViewProps {
  employees: Employee[];
}

// Helper function to check if two dates represent the same day
const isSameDay = (date1: Date, date2: Date): boolean => {
  return (
    date1.getDate() === date2.getDate() &&
    date1.getMonth() === date2.getMonth() &&
    date1.getFullYear() === date2.getFullYear()
  );
};

const CalendarView: React.FC<CalendarViewProps> = ({ employees }) => {
  const [calendarDate, setCalendarDate] = useState<Date>(new Date());
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [selectedEmployeeFilter, setSelectedEmployeeFilter] = useState<string>('all');
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const [eventToDelete, setEventToDelete] = useState<CalendarEvent | null>(null);
  const [selectedDateEvents, setSelectedDateEvents] = useState<{ 
    date: Date; 
    events: CalendarEvent[]; 
    dayNumber: number;
  } | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  
  // Form state
  const [formData, setFormData] = useState<EventFormData>({
    title: '',
    date: '',
    time: '09:00',
    type: 'event',
    employeeId: ''
  });

  const modalRef = useRef<HTMLDivElement>(null);
  const deleteModalRef = useRef<HTMLDivElement>(null);
  const eventsModalRef = useRef<HTMLDivElement>(null);

  // Close modals when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (isModalOpen && modalRef.current && !modalRef.current.contains(event.target as Node)) {
        setIsModalOpen(false);
      }
      if (eventToDelete && deleteModalRef.current && !deleteModalRef.current.contains(event.target as Node)) {
        setEventToDelete(null);
      }
      if (selectedDateEvents && eventsModalRef.current && !eventsModalRef.current.contains(event.target as Node)) {
        setSelectedDateEvents(null);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isModalOpen, eventToDelete, selectedDateEvents]);

  // Generate Trinidad and Tobago holidays for a specific year
  const generateTrinidadHolidays = async (year: number): Promise<CalendarEvent[]> => {
    try {
      // Check if holidays for this year are already in the database
      const { data: existingHolidays, error: checkError } = await supabase
        .from('calendar_events')
        .select('*')
        .eq('year', year)
        .eq('is_trinidad_holiday', true);
        
      if (checkError) throw checkError;
      
      // If we already have holidays for this year in the database, return them
      if (existingHolidays && existingHolidays.length > 0) {
        return existingHolidays.map(holiday => ({
          ...holiday,
          date: new Date(holiday.date),
          event_type: holiday.event_type as 'holiday'
        }));
      }
        
      // Define Trinidad holidays
      const holidays: CalendarEvent[] = [
        {
          id: `trinidad-new-year-${year}`,
          title: 'New Year\'s Day',
          date: new Date(year, 0, 1),
          event_type: 'holiday',
          color: 'var(--color-holiday, #FF5733)',
          is_holiday: true,
          is_trinidad_holiday: true,
          year
        },
        {
          id: `trinidad-indian-arrival-${year}`,
          title: 'Indian Arrival Day',
          date: new Date(year, 4, 30), // May 30
          event_type: 'holiday',
          color: 'var(--color-holiday, #FF5733)',
          is_holiday: true,
          is_trinidad_holiday: true,
          year
        },
        {
          id: `trinidad-labour-day-${year}`,
          title: 'Labour Day',
          date: new Date(year, 5, 19), // June 19
          event_type: 'holiday',
          color: 'var(--color-holiday, #FF5733)',
          is_holiday: true,
          is_trinidad_holiday: true,
          year
        },
        {
          id: `trinidad-emancipation-${year}`,
          title: 'Emancipation Day',
          date: new Date(year, 7, 1), // August 1
          event_type: 'holiday',
          color: 'var(--color-holiday, #FF5733)',
          is_holiday: true,
          is_trinidad_holiday: true,
          year
        },
        {
          id: `trinidad-independence-${year}`,
          title: 'Independence Day',
          date: new Date(year, 7, 31), // August 31
          event_type: 'holiday',
          color: 'var(--color-holiday, #FF5733)',
          is_holiday: true,
          is_trinidad_holiday: true,
          year
        },
        {
          id: `trinidad-republic-day-${year}`,
          title: 'Republic Day',
          date: new Date(year, 8, 24), // September 24
          event_type: 'holiday',
          color: 'var(--color-holiday, #FF5733)',
          is_holiday: true,
          is_trinidad_holiday: true,
          year
        },
        {
          id: `trinidad-christmas-${year}`,
          title: 'Christmas Day',
          date: new Date(year, 11, 25), // December 25
          event_type: 'holiday',
          color: 'var(--color-holiday, #FF5733)',
          is_holiday: true,
          is_trinidad_holiday: true,
          year
        },
        {
          id: `trinidad-boxing-day-${year}`,
          title: 'Boxing Day',
          date: new Date(year, 11, 26), // December 26
          event_type: 'holiday',
          color: 'var(--color-holiday, #FF5733)',
          is_holiday: true,
          is_trinidad_holiday: true,
          year
        }
      ];

      // Calculate Easter-based holidays
      const easterDates = getEasterDates(year);
      if (easterDates) {
        const { goodFriday, easterMonday } = easterDates;
        
        holidays.push({
          id: `trinidad-good-friday-${year}`,
          title: 'Good Friday',
          date: goodFriday,
          event_type: 'holiday',
          color: 'var(--color-holiday, #FF5733)',
          is_holiday: true,
          is_trinidad_holiday: true,
          year
        });
        
        holidays.push({
          id: `trinidad-easter-monday-${year}`,
          title: 'Easter Monday',
          date: easterMonday,
          event_type: 'holiday',
          color: 'var(--color-holiday, #FF5733)',
          is_holiday: true,
          is_trinidad_holiday: true,
          year
        });
      }

      // Calculate approximate Carnival dates (2 days before Ash Wednesday)
      if (easterDates) {
        const { goodFriday } = easterDates;
        
        // Ash Wednesday is 46 days before Easter Sunday (which is goodFriday + 2)
        const ashWednesday = new Date(goodFriday);
        ashWednesday.setDate(goodFriday.getDate() - 46 + 2);
        
        // Carnival Monday and Tuesday are the 2 days before Ash Wednesday
        const carnivalTuesday = new Date(ashWednesday);
        carnivalTuesday.setDate(ashWednesday.getDate() - 1);
        
        const carnivalMonday = new Date(ashWednesday);
        carnivalMonday.setDate(ashWednesday.getDate() - 2);
        
        holidays.push({
          id: `trinidad-carnival-monday-${year}`,
          title: 'Carnival Monday',
          date: carnivalMonday,
          event_type: 'holiday',
          color: 'var(--color-holiday, #FF5733)',
          is_holiday: true,
          is_trinidad_holiday: true,
          year
        });
        
        holidays.push({
          id: `trinidad-carnival-tuesday-${year}`,
          title: 'Carnival Tuesday',
          date: carnivalTuesday,
          event_type: 'holiday',
          color: 'var(--color-holiday, #FF5733)',
          is_holiday: true,
          is_trinidad_holiday: true,
          year
        });
      }

      // Save Trinidad holidays to the database
      const holidaysForDb = holidays.map(holiday => ({
        id: holiday.id,
        title: holiday.title,
        date: holiday.date.toISOString(),
        event_type: holiday.event_type,
        color: holiday.color,
        is_holiday: holiday.is_holiday,
        is_trinidad_holiday: holiday.is_trinidad_holiday,
        year: holiday.year
      }));
      
      const { error: insertError } = await supabase
        .from('calendar_events')
        .upsert(holidaysForDb, { onConflict: 'id' });
        
      if (insertError) {
        console.error('Error saving Trinidad holidays:', insertError);
      }
        
      return holidays;
    } catch (error) {
      console.error('Error generating or saving Trinidad holidays:', error);
      return [];
    }
  };

  // Helper function to calculate Easter dates
  const getEasterDates = (year: number): { goodFriday: Date, easterMonday: Date } | null => {
    try {
      // Algorithm to calculate Easter Sunday (Meeus/Jones/Butcher algorithm)
      const a = year % 19;
      const b = Math.floor(year / 100);
      const c = year % 100;
      const d = Math.floor(b / 4);
      const e = b % 4;
      const f = Math.floor((b + 8) / 25);
      const g = Math.floor((b - f + 1) / 3);
      const h = (19 * a + b - d - g + 15) % 30;
      const i = Math.floor(c / 4);
      const k = c % 4;
      const l = (32 + 2 * e + 2 * i - h - k) % 7;
      const m = Math.floor((a + 11 * h + 22 * l) / 451);
      const month = Math.floor((h + l - 7 * m + 114) / 31) - 1;
      const day = ((h + l - 7 * m + 114) % 31) + 1;
      
      // Create Easter Sunday date
      const easterSunday = new Date(year, month, day);
      
      // Calculate Good Friday (Easter Sunday - 2 days)
      const goodFriday = new Date(easterSunday);
      goodFriday.setDate(easterSunday.getDate() - 2);
      
      // Calculate Easter Monday (Easter Sunday + 1 day)
      const easterMonday = new Date(easterSunday);
      easterMonday.setDate(easterSunday.getDate() + 1);
      
      return { goodFriday, easterMonday };
    } catch (e) {
      console.error('Error calculating Easter dates:', e);
      return null;
    }
  };

  // Load events from Supabase on component mount
  useEffect(() => {
    fetchEvents();
    
    // Set up real-time subscription to calendar_events table
    const eventsSubscription = supabase
      .channel('calendar_events_changes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'calendar_events'
      }, (payload) => {
        console.log('Real-time update received:', payload);
        
        // Handle different types of changes
        if (payload.eventType === 'INSERT') {
          // Add the new event to our local state
          const newEvent = payload.new;
          if (newEvent) {
            console.log('Adding new event from real-time update:', newEvent);
            const eventToAdd: CalendarEvent = {
              id: newEvent.id,
              title: newEvent.title,
              date: new Date(newEvent.date),
              event_type: newEvent.event_type as 'holiday' | 'event' | 'reminder',
              employee_id: newEvent.employee_id,
              employeeName: newEvent.employee_id 
                ? employees.find(emp => emp.id === newEvent.employee_id)?.name || 'Unknown'
                : undefined,
              is_holiday: newEvent.is_holiday,
              is_trinidad_holiday: newEvent.is_trinidad_holiday,
              color: newEvent.color
            };
            
            setEvents(prevEvents => {
              // Check if event already exists to prevent duplicates
              if (prevEvents.some(e => e.id === eventToAdd.id)) {
                return prevEvents;
              }
              return [...prevEvents, eventToAdd];
            });
            
            // Update selected date events if needed
            if (selectedDateEvents && isSameDay(eventToAdd.date, selectedDateEvents.date)) {
              setSelectedDateEvents(prev => ({
                ...prev!,
                events: [...prev!.events, eventToAdd]
              }));
            }
          }
        } else if (payload.eventType === 'UPDATE') {
          // Update the event in our local state
          const updatedEvent = payload.new;
          if (updatedEvent) {
            console.log('Updating event from real-time update:', updatedEvent);
            setEvents(prevEvents => 
              prevEvents.map(event => 
                event.id === updatedEvent.id 
                  ? {
                      ...event,
                      title: updatedEvent.title,
                      date: new Date(updatedEvent.date),
                      event_type: updatedEvent.event_type,
                      employee_id: updatedEvent.employee_id,
                      color: updatedEvent.color
                    }
                  : event
              )
            );
            
            // Update selected date events if needed
            if (selectedDateEvents) {
              const updatedDate = new Date(updatedEvent.date);
              const isSelectedDay = selectedDateEvents.events.some(e => e.id === updatedEvent.id);
              const isSameDayAsSelected = isSameDay(updatedDate, selectedDateEvents.date);
              
              if (!isSelectedDay && isSameDayAsSelected) {
                // Event moved to this day, add to selected
                const eventWithDate: CalendarEvent = {
                  ...updatedEvent,
                  title: updatedEvent.title,
                  id: updatedEvent.id,
                  date: updatedDate,
                  event_type: updatedEvent.event_type as 'holiday' | 'event' | 'reminder',
                  employeeName: updatedEvent.employee_id 
                    ? employees.find(emp => emp.id === updatedEvent.employee_id)?.name || 'Unknown'
                    : undefined
                };
                setSelectedDateEvents(prev => ({
                  ...prev!,
                  events: [...prev!.events, eventWithDate]
                }));
              } else if (isSelectedDay) {
                // Event updated but still on same day
                setSelectedDateEvents(prev => ({
                  ...prev!,
                  events: prev!.events.map(e => 
                    e.id === updatedEvent.id
                      ? {
                          ...e,
                          title: updatedEvent.title,
                          event_type: updatedEvent.event_type,
                          employee_id: updatedEvent.employee_id,
                          color: updatedEvent.color
                        }
                      : e
                  )
                }));
              }
            }
          }
        } else if (payload.eventType === 'DELETE') {
          // Remove the event from our local state
          const deletedEventId = payload.old?.id;
          if (deletedEventId) {
            console.log('Removing deleted event from real-time update, ID:', deletedEventId);
            
            setEvents(prevEvents => {
              const updatedEvents = prevEvents.filter(event => event.id !== deletedEventId);
              console.log(`Events after real-time removal: ${updatedEvents.length} (was ${prevEvents.length})`);
              return updatedEvents;
            });
            
            // Update selected date events if needed
            if (selectedDateEvents && selectedDateEvents.events.some(e => e.id === deletedEventId)) {
              const updatedSelectedEvents = selectedDateEvents.events.filter(e => e.id !== deletedEventId);
              if (updatedSelectedEvents.length === 0) {
                setSelectedDateEvents(null);
              } else {
                setSelectedDateEvents({
                  ...selectedDateEvents,
                  events: updatedSelectedEvents
                });
              }
            }
          }
        }
      })
      .subscribe();
    
    // Cleanup subscription on component unmount
    return () => {
      eventsSubscription.unsubscribe();
    };
  }, [employees, calendarDate]);  // Include employees and calendarDate in the dependency array

  // Fetch events from Supabase
  const fetchEvents = async () => {
    try {
      setIsLoading(true);
      
      console.log('Fetching latest events from database...');
      
      // Fetch all events from the database that are not Trinidad holidays
      // Using a timestamp parameter to avoid caching issues
      const timestamp = new Date().getTime();
      const { data: customEvents, error: eventsError } = await supabase
        .from('calendar_events')
        .select('*')
        .eq('is_trinidad_holiday', false)
        .order('created_at', { ascending: false })
        .limit(1000)  // Add a reasonable limit
        .then(response => {
          console.log(`Fetched ${response.data?.length || 0} custom events at ${timestamp}`);
          return response;
        });
        
      if (eventsError) {
        console.error('Error fetching events:', eventsError);
        throw eventsError;
      }
      
      console.log('Fetched custom events from database:', customEvents);
      
      // Generate Trinidad holidays for the current year
      const currentYear = new Date().getFullYear();
      const trinidadHolidays = await generateTrinidadHolidays(currentYear);
      console.log(`Generated ${trinidadHolidays.length} Trinidad holidays for ${currentYear}`);
      
      // Create a map of event IDs to avoid duplicates
      const eventMap = new Map();
      
      // First add Trinidad holidays to the map
      trinidadHolidays.forEach(holiday => {
        eventMap.set(holiday.id, holiday);
      });
      
      // Then add custom events, converting dates properly
      (customEvents || []).forEach((event: any) => {
        try {
          // Create a proper Date object from the date string
          const eventDate = new Date(event.date);
          
          if (isNaN(eventDate.getTime())) {
            console.error(`Invalid date for event ${event.title}:`, event.date);
            return; // Skip this event
          }
          
          console.log(`Converting date for event ${event.title}:`, event.date, '→', eventDate);
          
          eventMap.set(event.id, {
            ...event,
            date: eventDate,
            event_type: event.event_type as 'holiday' | 'event' | 'reminder',
            employeeName: event.employee_id 
              ? employees.find(emp => emp.id === event.employee_id)?.name || 'Unknown'
              : undefined
          });
        } catch (err) {
          console.error(`Error processing event ${event.id}:`, err);
        }
      });
      
      // Convert map to array
      const allEvents = Array.from(eventMap.values());
      
      console.log(`Setting events state with ${allEvents.length} total events`);
      console.log('All events:', allEvents);
      
      setEvents(allEvents);
    } catch (error) {
      console.error('Error fetching events from database:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // When calendar date changes to a different year, ensure Trinidad holidays are shown
  useEffect(() => {
    const loadHolidaysForYear = async () => {
      // Check if we've switched to a different year
      const currentYear = calendarDate.getFullYear();
      const hasHolidaysForYear = events.some(event => 
        event.event_type === 'holiday' && 
        event.date.getFullYear() === currentYear &&
        event.is_trinidad_holiday
      );
      
      // If we don't have Trinidad holidays for this year, add them
      if (!hasHolidaysForYear) {
        const trinidadHolidays = await generateTrinidadHolidays(currentYear);
        
        setEvents(prev => [...prev, ...trinidadHolidays]);
      }
    };
    
    loadHolidaysForYear();
  }, [calendarDate.getFullYear()]);

  // Add a new event to the calendar
  const addEvent = async (title: string, date: Date, type: 'event' | 'reminder', employeeId?: string) => {
    try {
      console.log('Adding event:', { title, date, type, employeeId });
      console.log('Date timestamp:', date.getTime());
      
      const employeeName = employeeId 
        ? employees.find(emp => emp.id === employeeId)?.name 
        : undefined;
      
      const color = type === 'event' 
        ? 'var(--color-event, #9C27B0)' 
        : 'var(--color-reminder, #FF9800)';
      
      // Add to Supabase
      const { data, error } = await supabase
        .from('calendar_events')
        .insert({
          title,
          date: date.toISOString(),
          event_type: type,
          employee_id: employeeId,
          color,
          is_holiday: false,
          is_trinidad_holiday: false
        })
        .select();
        
      if (error) {
        console.error('Supabase insert error:', error);
        throw error;
      }
      
      console.log('Event saved to database:', data);
      
      // Add to local state with a proper Date object
      if (data && data.length > 0) {
        const newEvent: CalendarEvent = {
          ...data[0],
          date: new Date(data[0].date),
          employeeName
        };
        
        console.log('Adding event to state:', newEvent);
        console.log('New event date:', newEvent.date);
        
        // This approach ensures the events state is properly updated
        setEvents(prevEvents => {
          const updatedEvents = [...prevEvents, newEvent];
          console.log('Updated events state:', updatedEvents);
          return updatedEvents;
        });
        
        return newEvent;
      }
      return null;
    } catch (error) {
      console.error('Error adding event:', error);
      return null;
    }
  };

  // Remove an event from the calendar
  const removeEvent = async (eventId: string) => {
    try {
      console.log(`Attempting to remove event with ID: ${eventId}`);
      
      // Check if this is a built-in Trinidad holiday
      const eventToRemove = events.find(e => e.id === eventId);
      
      if (!eventToRemove) {
        console.error(`Event with ID ${eventId} not found`);
        setEventToDelete(null);
        return false;
      }
      
      if (eventToRemove.is_trinidad_holiday) {
        alert("Trinidad holidays cannot be deleted.");
        setEventToDelete(null);
        return false;
      }
      
      console.log(`Deleting event from Supabase: ${eventToRemove.title}`);
      
      // Delete from Supabase
      const { data, error } = await supabase
        .from('calendar_events')
        .delete()
        .eq('id', eventId);
      
      if (error) {
        console.error('Error deleting from Supabase:', error);
        alert(`Database error: ${error.message}`);
        throw error;
      }
      
      console.log('Delete operation completed successfully');
      
      // Remove from local state immediately
      setEvents(prev => {
        const updated = prev.filter(event => event.id !== eventId);
        console.log(`Events after removal: ${updated.length} (was ${prev.length})`);
        return updated;
      });
      
      setEventToDelete(null);
      
      // If we have selected date events, refresh the list
      if (selectedDateEvents) {
        setSelectedDateEvents(prev => {
          if (!prev) return null;
          
          const updatedEvents = prev.events.filter(event => event.id !== eventId);
          
          if (updatedEvents.length === 0) {
            return null;
          } else {
            return {
              ...prev,
              events: updatedEvents
            };
          }
        });
      }
      
      // Force a refresh of events from database to ensure consistency
      setTimeout(() => {
        fetchEvents();
      }, 500);
      
      return true;
    } catch (error) {
      console.error('Error removing event:', error);
      alert(`Failed to delete event: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return false;
    }
  };

  // Open modal for adding an event
  const openAddEventModal = (day?: number) => {
    const year = calendarDate.getFullYear();
    const month = calendarDate.getMonth();
    const selectedDate = day || new Date().getDate();
    
    // Format date for the input (YYYY-MM-DD)
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(Math.min(selectedDate, daysInMonth(year, month))).padStart(2, '0')}`;
    
    // Get current time rounded to nearest half hour for default
    const now = new Date();
    const hours = now.getHours();
    const minutes = now.getMinutes() >= 30 ? 30 : 0;
    const defaultTime = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
    
    setFormData({
      title: '',
      date: dateStr,
      time: defaultTime,
      type: 'event',
      employeeId: ''
    });
    
    setSelectedDay(day || null);
    setIsModalOpen(true);
    // Close events modal if it's open
    setSelectedDateEvents(null);
  };

  // Handle form input changes
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.title.trim()) {
      alert('Please enter an event title');
      return;
    }

    // Combine date and time values
    const [year, month, day] = formData.date.split('-').map(Number);
    let [hours, minutes] = [0, 0];
    
    if (formData.time) {
      [hours, minutes] = formData.time.split(':').map(Number);
    }
    
    const eventDate = new Date(year, month - 1, day, hours, minutes);
    console.log('Created event date object:', eventDate);
    
    if (isNaN(eventDate.getTime())) {
      alert('Please enter a valid date and time');
      return;
    }

    // Close the modal immediately for better UX
    setIsModalOpen(false);
    
    try {
      // Add the event and get the returned new event with correct ID from database
      const newEvent = await addEvent(
        formData.title,
        eventDate,
        formData.type as 'event' | 'reminder',
        formData.employeeId || undefined
      );
      
      if (newEvent) {
        console.log('Successfully added event, now refreshing calendar');
        
        // If we added an event for the selected date, update the selected date events
        if (selectedDateEvents && 
            day === selectedDateEvents.dayNumber && 
            month - 1 === selectedDateEvents.date.getMonth() && 
            year === selectedDateEvents.date.getFullYear()) {
          
          setSelectedDateEvents(prev => {
            if (!prev) return null;
            return {
              ...prev,
              events: [...prev.events, newEvent]
            };
          });
        }
        
        // Force a complete refresh of events from the database
        await fetchEvents();
        
        // Force a re-render of the calendar
        setCalendarDate(new Date(calendarDate.getTime()));
      } else {
        console.error('Failed to add event - newEvent is null');
      }
    } catch (error) {
      console.error('Error in handleSubmit:', error);
      alert('There was an error adding the event. Please try again.');
    }
  };

  // Calendar helpers
  const daysInMonth = (year: number, month: number): number => {
    return new Date(year, month + 1, 0).getDate();
  };

  const firstDayOfMonth = (year: number, month: number): number => {
    return new Date(year, month, 1).getDay();
  };

  const getMonthName = (month: number): string => {
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 
                    'July', 'August', 'September', 'October', 'November', 'December'];
    return months[month];
  };

  const formatEventDate = (date: Date): string => {
    return date.toLocaleDateString(undefined, {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const formatEventTime = (date: Date): string => {
    return date.toLocaleTimeString(undefined, {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Handle day click to show events
  const handleDayClick = (dayNumber: number, hasEvents: boolean) => {
    if (!hasEvents) {
      // If there are no events, just open the add event modal
      openAddEventModal(dayNumber);
      return;
    }
    
    const year = calendarDate.getFullYear();
    const month = calendarDate.getMonth();
    const clickedDate = new Date(year, month, dayNumber);
    
    // Filter events for this day
    const dayEvents = events.filter(event => {
      const eventDate = new Date(event.date);
      const matchesDay = (
        eventDate.getDate() === dayNumber && 
        eventDate.getMonth() === month && 
        eventDate.getFullYear() === year
      );
      
      // Apply employee filter
      return matchesDay && (
        selectedEmployeeFilter === 'all' || 
        event.employee_id === selectedEmployeeFilter || 
        event.event_type === 'holiday'
      );
    });
    
    // Sort events by time
    dayEvents.sort((a, b) => a.date.getTime() - b.date.getTime());
    
    setSelectedDateEvents({
      date: clickedDate,
      events: dayEvents,
      dayNumber
    });
  };

  // Function to render calendar
  const renderCalendar = () => {
    const year = calendarDate.getFullYear();
    const month = calendarDate.getMonth();
    
    const daysCount = daysInMonth(year, month);
    const firstDay = firstDayOfMonth(year, month);
    
    const days = [];
    
    // Empty cells for days before the first day of the month
    for (let i = 0; i < firstDay; i++) {
      days.push(<div key={`empty-${i}`} className="calendar-day empty"></div>);
    }
    
    // Debug the current events in state
    console.log('Rendering calendar with events:', events);
    
    // Days of the month
    for (let i = 1; i <= daysCount; i++) {
      const date = new Date(year, month, i);
      const isToday = new Date().toDateString() === date.toDateString();
      
      // Filter events for this day
      const dayEvents = events.filter(event => {
        // Skip if event.date is not a valid date
        if (!(event.date instanceof Date) || isNaN(event.date.getTime())) {
          console.error('Invalid date in event:', event);
          return false;
        }
        
        // Get the local date string for accurate comparison (ignoring time)
        const eventDateStr = event.date.toDateString();
        const currentDateStr = new Date(year, month, i).toDateString();
        
        // Compare the date strings for more reliable matching
        const matchesDay = eventDateStr === currentDateStr;
        
        // For debugging
        if (i === 15 || matchesDay) {
          console.log(`Comparing dates for day ${i}:`, {
            eventDate: event.date,
            eventDateStr,
            currentDate: new Date(year, month, i),
            currentDateStr,
            matches: matchesDay
          });
        }
        
        // Apply employee filter
        return matchesDay && (
          selectedEmployeeFilter === 'all' || 
          event.employee_id === selectedEmployeeFilter || 
          event.event_type === 'holiday'
        );
      });
      
      if (dayEvents.length > 0) {
        console.log(`Found ${dayEvents.length} events for day ${i}:`, dayEvents);
      }
      
      // Sort events by time for both views
      dayEvents.sort((a, b) => a.date.getTime() - b.date.getTime());
      
      // Check if this day is selected
      const isSelected = selectedDateEvents?.dayNumber === i && 
                       selectedDateEvents?.date.getMonth() === month &&
                       selectedDateEvents?.date.getFullYear() === year;
      
      // Determine if this day has events and what types (for mobile view)
      const hasHoliday = dayEvents.some(event => event.event_type === 'holiday');
      const hasEvent = dayEvents.some(event => event.event_type === 'event');
      const hasReminder = dayEvents.some(event => event.event_type === 'reminder');
      
      days.push(
        <div 
          key={`day-${i}`} 
          className={`calendar-day ${isToday ? 'today' : ''} ${isSelected ? 'selected' : ''} ${dayEvents.length > 0 ? 'has-events' : ''}`}
          onClick={() => handleDayClick(i, dayEvents.length > 0)}
        >
          <div className="calendar-day-number">{i}</div>
          
          {/* Mobile View - Event Indicators */}
          <div className="mobile-event-view">
            <div className="event-indicators">
              {hasHoliday && <span className="event-indicator holiday"></span>}
              {hasEvent && <span className="event-indicator event"></span>}
              {hasReminder && <span className="event-indicator reminder"></span>}
            </div>
            <div className="event-count">
              {dayEvents.length > 0 && <span>{dayEvents.length}</span>}
            </div>
          </div>
          
          {/* Desktop View - Full Events */}
          <div className="desktop-event-view">
            {dayEvents.map(event => (
              <div 
                key={event.id} 
                className={`calendar-event ${event.event_type}`}
                style={{ backgroundColor: event.color }}
                title={`${event.title}${event.employeeName ? ` - ${event.employeeName}` : ''} 
${event.event_type !== 'holiday' ? formatEventTime(event.date) : ''}`}
                onClick={(e) => {
                  e.stopPropagation();
                  if (event.event_type !== 'holiday' || !event.is_trinidad_holiday) {
                    setEventToDelete(event);
                  }
                }}
              >
                <span className="event-icon">
                  {event.event_type === 'holiday' ? '🎉' : event.event_type === 'event' ? '📅' : '⏰'}
                </span>
                <div className="event-content">
                  <span className="event-title">
                    {event.title}
                    {event.employeeName && <small className="event-employee"> - {event.employeeName}</small>}
                  </span>
                  {event.event_type !== 'holiday' && (
                    <span className="event-time">{formatEventTime(event.date)}</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      );
    }
    
    return days;
  };

  // Function to go to previous month
  const prevMonth = () => {
    setCalendarDate(new Date(calendarDate.getFullYear(), calendarDate.getMonth() - 1, 1));
    setSelectedDateEvents(null);
  };

  // Function to go to next month
  const nextMonth = () => {
    setCalendarDate(new Date(calendarDate.getFullYear(), calendarDate.getMonth() + 1, 1));
    setSelectedDateEvents(null);
  };

  // Function to go to current month
  const goToday = () => {
    setCalendarDate(new Date());
    setSelectedDateEvents(null);
  };

  return (
    <div className="calendar-view glass-effect">
      {isLoading ? (
        <div className="loading-spinner">Loading calendar events...</div>
      ) : (
        <>
          <div className="calendar-controls">
            <h2>Company Calendar</h2>
            
            <div className="calendar-actions">
              <button 
                className="add-event-global-button glass-button"
                onClick={() => openAddEventModal()}
              >
                <span className="button-icon">+</span> Add Event
              </button>
              
              <button 
                className="today-button glass-button"
                onClick={goToday}
              >
                Today
              </button>
              
              {employees.length > 0 && (
                <div className="employee-filter">
                  <select 
                    value={selectedEmployeeFilter}
                    onChange={(e) => setSelectedEmployeeFilter(e.target.value)}
                    className="glass-select"
                  >
                    <option value="all">All Employees</option>
                    {employees.map(emp => (
                      <option key={emp.id} value={emp.id}>{emp.name}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          </div>
          
          <div className="calendar-container global-calendar glass-effect">
            <div className="calendar-header">
              <button 
                className="calendar-nav-button"
                onClick={prevMonth}
              >
                &lt;
              </button>
              <h3 className="calendar-title">{getMonthName(calendarDate.getMonth())} {calendarDate.getFullYear()}</h3>
              <button 
                className="calendar-nav-button"
                onClick={nextMonth}
              >
                &gt;
              </button>
            </div>
            <div className="calendar-weekdays">
              <div>Sun</div>
              <div>Mon</div>
              <div>Tue</div>
              <div>Wed</div>
              <div>Thu</div>
              <div>Fri</div>
              <div>Sat</div>
            </div>
            <div className="calendar-days">
              {renderCalendar()}
            </div>
            <div className="calendar-legend">
              <div className="legend-item">
                <span className="legend-icon holiday">🎉</span>
                <span>Trinidad Holiday</span>
              </div>
              <div className="legend-item">
                <span className="legend-icon event">📅</span>
                <span>Event</span>
              </div>
              <div className="legend-item">
                <span className="legend-icon reminder">⏰</span>
                <span>Reminder</span>
              </div>
            </div>
          </div>

          {/* Day Events Modal */}
          {selectedDateEvents && (
            <div className="modal-overlay">
              <div className="event-modal events-list-modal glass-effect" ref={eventsModalRef}>
                <div className="modal-header">
                  <h3>Events for {getMonthName(selectedDateEvents.date.getMonth())} {selectedDateEvents.dayNumber}</h3>
                  <button 
                    className="close-modal-btn"
                    onClick={() => setSelectedDateEvents(null)}
                  >
                    ×
                  </button>
                </div>
                <div className="events-list">
                  {selectedDateEvents.events.length === 0 ? (
                    <div className="no-events">No events for this day</div>
                  ) : (
                    selectedDateEvents.events.map(event => (
                      <div 
                        key={event.id} 
                        className={`event-list-item ${event.event_type}`}
                        onClick={() => {
                          if (event.event_type !== 'holiday' || !event.is_trinidad_holiday) {
                            setEventToDelete(event);
                            setSelectedDateEvents(null);
                          }
                        }}
                      >
                        <div 
                          className="event-color-indicator" 
                          style={{ backgroundColor: event.color }}
                        ></div>
                        <div className="event-list-icon">
                          {event.event_type === 'holiday' ? '🎉' : event.event_type === 'event' ? '📅' : '⏰'}
                        </div>
                        <div className="event-list-content">
                          <div className="event-list-title">{event.title}</div>
                          {event.employeeName && (
                            <div className="event-list-employee">Assigned to: {event.employeeName}</div>
                          )}
                          {event.event_type !== 'holiday' && (
                            <div className="event-list-time">{formatEventTime(event.date)}</div>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
                <div className="events-modal-actions">
                  <button 
                    className="add-event-btn"
                    onClick={() => {
                      openAddEventModal(selectedDateEvents.dayNumber);
                    }}
                  >
                    + Add Event
                  </button>
                  <button 
                    className="close-btn"
                    onClick={() => setSelectedDateEvents(null)}
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Add Event Modal */}
          {isModalOpen && (
            <div className="modal-overlay">
              <div className="event-modal glass-effect" ref={modalRef}>
                <div className="modal-header">
                  <h3>{selectedDay ? `Add Event for ${getMonthName(calendarDate.getMonth())} ${selectedDay}` : 'Add New Event'}</h3>
                  <button 
                    className="close-modal-btn"
                    onClick={() => setIsModalOpen(false)}
                  >
                    ×
                  </button>
                </div>
                <form onSubmit={handleSubmit} className="event-form">
                  <div className="form-group">
                    <label htmlFor="title">Event Title</label>
                    <input
                      type="text"
                      id="title"
                      name="title"
                      value={formData.title}
                      onChange={handleInputChange}
                      placeholder="Enter event title"
                      className="form-control"
                      required
                    />
                  </div>
                  
                  <div className="form-row">
                    <div className="form-group date-group">
                      <label htmlFor="date">Date</label>
                      <input
                        type="date"
                        id="date"
                        name="date"
                        value={formData.date}
                        onChange={handleInputChange}
                        className="form-control"
                        required
                      />
                    </div>
                    
                    <div className="form-group time-group">
                      <label htmlFor="time">Time</label>
                      <input
                        type="time"
                        id="time"
                        name="time"
                        value={formData.time}
                        onChange={handleInputChange}
                        className="form-control"
                      />
                    </div>
                  </div>
                  
                  <div className="form-group">
                    <label htmlFor="type">Event Type</label>
                    <div className="event-type-selector">
                      <label className={`event-type-option ${formData.type === 'event' ? 'selected' : ''}`}>
                        <input
                          type="radio"
                          name="type"
                          value="event"
                          checked={formData.type === 'event'}
                          onChange={handleInputChange}
                        />
                        <span className="event-type-icon">📅</span>
                        <span>Event</span>
                      </label>
                      <label className={`event-type-option ${formData.type === 'reminder' ? 'selected' : ''}`}>
                        <input
                          type="radio"
                          name="type"
                          value="reminder"
                          checked={formData.type === 'reminder'}
                          onChange={handleInputChange}
                        />
                        <span className="event-type-icon">⏰</span>
                        <span>Reminder</span>
                      </label>
                    </div>
                  </div>
                  
                  {employees.length > 0 && (
                    <div className="form-group">
                      <label htmlFor="employeeId">Assign to Employee (Optional)</label>
                      <select
                        id="employeeId"
                        name="employeeId"
                        value={formData.employeeId}
                        onChange={handleInputChange}
                        className="form-control"
                      >
                        <option value="">Not assigned</option>
                        {employees.map(emp => (
                          <option key={emp.id} value={emp.id}>{emp.name}</option>
                        ))}
                      </select>
                    </div>
                  )}
                  
                  <div className="form-actions">
                    <button 
                      type="button" 
                      className="cancel-btn"
                      onClick={() => setIsModalOpen(false)}
                    >
                      Cancel
                    </button>
                    <button 
                      type="submit" 
                      className="submit-btn"
                    >
                      Add Event
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* Delete Confirmation Modal */}
          {eventToDelete && (
            <div className="modal-overlay">
              <div className="event-modal delete-modal glass-effect" ref={deleteModalRef}>
                <div className="modal-header delete-header">
                  <h3>Delete Event</h3>
                  <button 
                    className="close-modal-btn"
                    onClick={() => setEventToDelete(null)}
                  >
                    ×
                  </button>
                </div>
                <div className="delete-confirmation">
                  <div className="delete-icon">
                    {eventToDelete.event_type === 'event' ? '📅' : '⏰'}
                  </div>
                  <h4>{eventToDelete.title}</h4>
                  {eventToDelete.employeeName && (
                    <p className="delete-subtitle">Assigned to: {eventToDelete.employeeName}</p>
                  )}
                  <p className="delete-subtitle">Date: {formatEventDate(eventToDelete.date)}</p>
                  <p className="delete-subtitle">Time: {formatEventTime(eventToDelete.date)}</p>
                  <p className="delete-message">Are you sure you want to delete this event?</p>
                  
                  <div className="form-actions">
                    <button 
                      type="button" 
                      className="cancel-btn"
                      onClick={() => setEventToDelete(null)}
                    >
                      Cancel
                    </button>
                    <button 
                      type="button" 
                      className="delete-btn"
                      onClick={() => removeEvent(eventToDelete.id)}
                    >
                      Delete Event
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default CalendarView; 