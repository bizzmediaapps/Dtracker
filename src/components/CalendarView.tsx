import React, { useState, useEffect, useRef } from 'react';
import { Employee } from '../types';

// Calendar events interface
interface CalendarEvent {
  id: string;
  title: string;
  date: Date;
  type: 'holiday' | 'event' | 'reminder';
  employeeId?: string;
  employeeName?: string;
  color?: string;
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

const CalendarView: React.FC<CalendarViewProps> = ({ employees }) => {
  const [calendarDate, setCalendarDate] = useState<Date>(new Date());
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [selectedEmployeeFilter, setSelectedEmployeeFilter] = useState<string>('all');
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const [eventToDelete, setEventToDelete] = useState<CalendarEvent | null>(null);
  
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

  // Close modals when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (isModalOpen && modalRef.current && !modalRef.current.contains(event.target as Node)) {
        setIsModalOpen(false);
      }
      if (eventToDelete && deleteModalRef.current && !deleteModalRef.current.contains(event.target as Node)) {
        setEventToDelete(null);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isModalOpen, eventToDelete]);

  // Generate Trinidad and Tobago holidays for a specific year
  const generateTrinidadHolidays = (year: number): CalendarEvent[] => {
    const holidays: CalendarEvent[] = [
      {
        id: `trinidad-new-year-${year}`,
        title: 'New Year\'s Day',
        date: new Date(year, 0, 1),
        type: 'holiday',
        color: 'var(--color-holiday, #FF5733)'
      },
      {
        id: `trinidad-indian-arrival-${year}`,
        title: 'Indian Arrival Day',
        date: new Date(year, 4, 30), // May 30
        type: 'holiday',
        color: 'var(--color-holiday, #FF5733)'
      },
      {
        id: `trinidad-labour-day-${year}`,
        title: 'Labour Day',
        date: new Date(year, 5, 19), // June 19
        type: 'holiday',
        color: 'var(--color-holiday, #FF5733)'
      },
      {
        id: `trinidad-emancipation-${year}`,
        title: 'Emancipation Day',
        date: new Date(year, 7, 1), // August 1
        type: 'holiday',
        color: 'var(--color-holiday, #FF5733)'
      },
      {
        id: `trinidad-independence-${year}`,
        title: 'Independence Day',
        date: new Date(year, 7, 31), // August 31
        type: 'holiday',
        color: 'var(--color-holiday, #FF5733)'
      },
      {
        id: `trinidad-republic-day-${year}`,
        title: 'Republic Day',
        date: new Date(year, 8, 24), // September 24
        type: 'holiday',
        color: 'var(--color-holiday, #FF5733)'
      },
      {
        id: `trinidad-christmas-${year}`,
        title: 'Christmas Day',
        date: new Date(year, 11, 25), // December 25
        type: 'holiday',
        color: 'var(--color-holiday, #FF5733)'
      },
      {
        id: `trinidad-boxing-day-${year}`,
        title: 'Boxing Day',
        date: new Date(year, 11, 26), // December 26
        type: 'holiday',
        color: 'var(--color-holiday, #FF5733)'
      }
    ];

    // Calculate Easter-based holidays (approximate - would need a more complex algorithm for accuracy)
    // This is a simple approximation and might not be accurate for all years
    const easterDates = getEasterDates(year);
    if (easterDates) {
      const { goodFriday, easterMonday } = easterDates;
      
      holidays.push({
        id: `trinidad-good-friday-${year}`,
        title: 'Good Friday',
        date: goodFriday,
        type: 'holiday',
        color: 'var(--color-holiday, #FF5733)'
      });
      
      holidays.push({
        id: `trinidad-easter-monday-${year}`,
        title: 'Easter Monday',
        date: easterMonday,
        type: 'holiday',
        color: 'var(--color-holiday, #FF5733)'
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
        type: 'holiday',
        color: 'var(--color-holiday, #FF5733)'
      });
      
      holidays.push({
        id: `trinidad-carnival-tuesday-${year}`,
        title: 'Carnival Tuesday',
        date: carnivalTuesday,
        type: 'holiday',
        color: 'var(--color-holiday, #FF5733)'
      });
    }

    // Note: Eid-ul-Fitr, Divali, and Corpus Christi dates vary each year
    // For a production app, we would use a more sophisticated calculation or an API
    
    return holidays;
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

  // Load events from localStorage on component mount
  useEffect(() => {
    try {
      // Load calendar events
      const savedEvents = localStorage.getItem('calendarEvents');
      if (savedEvents) {
        const parsedEvents = JSON.parse(savedEvents);
        // Convert date strings back to Date objects and add employee names
        const eventsWithDates = parsedEvents.map((event: any) => {
          const employeeName = event.employeeId 
            ? employees.find(emp => emp.id === event.employeeId)?.name || 'Unknown'
            : undefined;
            
          return {
            ...event,
            date: new Date(event.date),
            employeeName
          };
        });
        setEvents(eventsWithDates);
      } else {
        // Initialize with Trinidad holidays for the current year
        const currentYear = new Date().getFullYear();
        const trinidadHolidays = generateTrinidadHolidays(currentYear);
        
        setEvents(trinidadHolidays);
        localStorage.setItem('calendarEvents', JSON.stringify(trinidadHolidays));
      }
    } catch (e) {
      console.error('Error loading calendar events from localStorage:', e);
    }
  }, [employees]);

  // Save events to localStorage whenever they change
  useEffect(() => {
    if (events.length > 0) {
      try {
        localStorage.setItem('calendarEvents', JSON.stringify(events));
      } catch (e) {
        console.error('Error saving calendar events to localStorage:', e);
      }
    }
  }, [events]);

  // Add a new event to the calendar
  const addEvent = (title: string, date: Date, type: 'event' | 'reminder', employeeId?: string) => {
    const employeeName = employeeId 
      ? employees.find(emp => emp.id === employeeId)?.name 
      : undefined;
    
    const newEvent: CalendarEvent = {
      id: Date.now().toString(),
      title,
      date,
      type,
      employeeId,
      employeeName,
      color: type === 'event' 
        ? 'var(--color-event, #9C27B0)' 
        : 'var(--color-reminder, #FF9800)'
    };
    
    setEvents(prev => [...prev, newEvent]);
  };

  // Remove an event from the calendar
  const removeEvent = (eventId: string) => {
    setEvents(prev => prev.filter(event => event.id !== eventId));
    setEventToDelete(null);
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
  const handleSubmit = (e: React.FormEvent) => {
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
    
    if (isNaN(eventDate.getTime())) {
      alert('Please enter a valid date and time');
      return;
    }

    addEvent(
      formData.title,
      eventDate,
      formData.type as 'event' | 'reminder',
      formData.employeeId || undefined
    );

    setIsModalOpen(false);
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

  // When calendar date changes to a different year, ensure Trinidad holidays are shown
  useEffect(() => {
    // Check if we've switched to a different year
    const currentYear = calendarDate.getFullYear();
    const hasHolidaysForYear = events.some(event => 
      event.type === 'holiday' && 
      event.date.getFullYear() === currentYear &&
      event.id.includes('trinidad')
    );
    
    // If we don't have Trinidad holidays for this year, add them
    if (!hasHolidaysForYear) {
      const trinidadHolidays = generateTrinidadHolidays(currentYear);
      
      // Filter out any existing Trinidad holidays for other years
      const filteredEvents = events.filter(event => 
        !(event.type === 'holiday' && event.id.includes('trinidad'))
      );
      
      // Add the Trinidad holidays for the current year
      setEvents([...filteredEvents, ...trinidadHolidays]);
    }
  }, [calendarDate.getFullYear()]);

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
    
    // Days of the month
    for (let i = 1; i <= daysCount; i++) {
      const date = new Date(year, month, i);
      const isToday = new Date().toDateString() === date.toDateString();
      
      // Filter events for this day
      const dayEvents = events.filter(event => {
        const eventDate = new Date(event.date);
        const matchesDay = (
          eventDate.getDate() === i && 
          eventDate.getMonth() === month && 
          eventDate.getFullYear() === year
        );
        
        // Apply employee filter
        return matchesDay && (
          selectedEmployeeFilter === 'all' || 
          event.employeeId === selectedEmployeeFilter || 
          event.type === 'holiday'
        );
      });
      
      // Sort events by time
      dayEvents.sort((a, b) => a.date.getTime() - b.date.getTime());
      
      days.push(
        <div key={`day-${i}`} className={`calendar-day ${isToday ? 'today' : ''}`}>
          <div className="calendar-day-number">{i}</div>
          {dayEvents.map(event => (
            <div 
              key={event.id} 
              className={`calendar-event ${event.type}`}
              style={{ backgroundColor: event.color }}
              title={`${event.title}${event.employeeName ? ` - ${event.employeeName}` : ''} 
${event.type !== 'holiday' ? formatEventTime(event.date) : ''}`}
              data-employee-id={event.employeeId || (event.type === 'holiday' ? 'holiday' : '')}
              onClick={() => {
                if (event.type !== 'holiday') {
                  setEventToDelete(event);
                }
              }}
            >
              <span className="event-icon">
                {event.type === 'holiday' ? '🎉' : event.type === 'event' ? '📅' : '⏰'}
              </span>
              <div className="event-content">
                <span className="event-title">
                  {event.title}
                  {event.employeeName && <small className="event-employee"> - {event.employeeName}</small>}
                </span>
                {event.type !== 'holiday' && (
                  <span className="event-time">{formatEventTime(event.date)}</span>
                )}
              </div>
            </div>
          ))}
          <div 
            className="add-event-button" 
            onClick={() => openAddEventModal(i)}
          >
            +
          </div>
        </div>
      );
    }
    
    return days;
  };

  // Function to go to previous month
  const prevMonth = () => {
    setCalendarDate(new Date(calendarDate.getFullYear(), calendarDate.getMonth() - 1, 1));
  };

  // Function to go to next month
  const nextMonth = () => {
    setCalendarDate(new Date(calendarDate.getFullYear(), calendarDate.getMonth() + 1, 1));
  };

  // Function to go to current month
  const goToday = () => {
    setCalendarDate(new Date());
  };

  return (
    <div className="calendar-view glass-effect">
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
                {eventToDelete.type === 'event' ? '📅' : '⏰'}
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
    </div>
  );
};

export default CalendarView; 