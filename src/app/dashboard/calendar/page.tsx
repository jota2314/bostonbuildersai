'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import DashboardLayout from '@/components/DashboardLayout';
import CalendarChat from '@/components/CalendarChat';
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Check,
  Trash2,
  X,
} from 'lucide-react';

type ViewType = 'week' | 'day';

interface Todo {
  id: string;
  title: string;
  description: string | null;
  due_date: string | null;
  completed: boolean;
  created_at: string;
  user_id: string;
}

interface CalendarEvent {
  id: string;
  title: string;
  description: string | null;
  event_date: string;
  start_time: string | null;
  end_time: string | null;
  created_at: string;
  user_id: string;
}

export default function CalendarPage() {
  const [view, setView] = useState<ViewType>('week');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [currentTime, setCurrentTime] = useState(new Date());
  const [todos, setTodos] = useState<Todo[]>([]);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [userEmail, setUserEmail] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [userId, setUserId] = useState<string>('');
  const [showTodoModal, setShowTodoModal] = useState(false);
  const [showEventModal, setShowEventModal] = useState(false);
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null);
  const [todoForm, setTodoForm] = useState({
    title: '',
    description: '',
    due_date: '',
  });
  const [eventForm, setEventForm] = useState({
    title: '',
    description: '',
    event_date: '',
    start_time: '',
    end_time: '',
  });

  const supabase = createClient();

  useEffect(() => {
    fetchUser();
    fetchTodos();
    fetchEvents();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Update current time every minute
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000); // Update every minute

    return () => clearInterval(timer);
  }, []);

  const fetchUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user?.email) {
      setUserEmail(user.email);
    }
    if (user?.id) {
      setUserId(user.id);
    }
  };

  const refreshCalendarData = () => {
    fetchTodos();
    fetchEvents();
  };

  const fetchTodos = async () => {
    try {
      setError(null);
      const { data, error } = await supabase
        .from('todos')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setTodos(data || []);
    } catch (error) {
      console.error('Error fetching todos:', error);
      setError('Failed to load tasks. Please refresh the page.');
    } finally {
      setLoading(false);
    }
  };

  const fetchEvents = async () => {
    try {
      const { data, error } = await supabase
        .from('calendar_events')
        .select('*')
        .order('event_date', { ascending: true });

      if (error) throw error;
      setEvents(data || []);
    } catch (error) {
      console.error('Error fetching events:', error);
      setError('Failed to load events. Please refresh the page.');
    }
  };

  const toggleTodo = async (id: string, completed: boolean) => {
    try {
      const { error } = await supabase
        .from('todos')
        .update({ completed: !completed })
        .eq('id', id);

      if (error) throw error;
      fetchTodos();
    } catch (error) {
      console.error('Error updating todo:', error);
    }
  };

  const deleteTodo = async (id: string) => {
    try {
      const { error } = await supabase
        .from('todos')
        .delete()
        .eq('id', id);

      if (error) throw error;
      fetchTodos();
    } catch (error) {
      console.error('Error deleting todo:', error);
    }
  };

  const deleteEvent = async (id: string) => {
    if (!confirm('Are you sure you want to delete this event?')) return;

    try {
      const { error } = await supabase
        .from('calendar_events')
        .delete()
        .eq('id', id);

      if (error) throw error;
      fetchEvents();
    } catch (error) {
      console.error('Error deleting event:', error);
    }
  };

  const createTodo = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from('todos')
        .insert([
          {
            ...todoForm,
            user_id: user.id,
            due_date: todoForm.due_date || null,
          },
        ]);

      if (error) throw error;

      setTodoForm({ title: '', description: '', due_date: '' });
      setShowTodoModal(false);
      fetchTodos();
    } catch (error) {
      console.error('Error creating todo:', error);
      alert('Failed to create task. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const createEvent = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate end time is after start time
    if (eventForm.start_time && eventForm.end_time) {
      const [startHour, startMin] = eventForm.start_time.split(':').map(Number);
      const [endHour, endMin] = eventForm.end_time.split(':').map(Number);
      const startMinutes = startHour * 60 + startMin;
      const endMinutes = endHour * 60 + endMin;

      if (endMinutes <= startMinutes) {
        alert('End time must be after start time');
        return;
      }
    }

    setSubmitting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      if (editingEvent) {
        // Update existing event
        const { error } = await supabase
          .from('calendar_events')
          .update({
            title: eventForm.title,
            description: eventForm.description,
            event_date: eventForm.event_date,
            start_time: eventForm.start_time || null,
            end_time: eventForm.end_time || null,
          })
          .eq('id', editingEvent.id);

        if (error) throw error;
      } else {
        // Create new event
        const { error } = await supabase
          .from('calendar_events')
          .insert([
            {
              ...eventForm,
              user_id: user.id,
              start_time: eventForm.start_time || null,
              end_time: eventForm.end_time || null,
            },
          ]);

        if (error) throw error;
      }

      setEventForm({ title: '', description: '', event_date: '', start_time: '', end_time: '' });
      setShowEventModal(false);
      setEditingEvent(null);
      fetchEvents();
    } catch (error) {
      console.error('Error saving event:', error);
      alert('Failed to save event. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  // Calendar navigation
  const goToPrevious = () => {
    const newDate = new Date(currentDate);
    if (view === 'week') {
      newDate.setDate(newDate.getDate() - 7);
    } else {
      newDate.setDate(newDate.getDate() - 1);
    }
    setCurrentDate(newDate);
  };

  const goToNext = () => {
    const newDate = new Date(currentDate);
    if (view === 'week') {
      newDate.setDate(newDate.getDate() + 7);
    } else {
      newDate.setDate(newDate.getDate() + 1);
    }
    setCurrentDate(newDate);
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  // Generate week days
  const generateWeekDays = () => {
    const days: Date[] = [];
    const startOfWeek = new Date(currentDate);
    startOfWeek.setDate(currentDate.getDate() - currentDate.getDay());

    for (let i = 0; i < 7; i++) {
      const day = new Date(startOfWeek);
      day.setDate(startOfWeek.getDate() + i);
      days.push(day);
    }

    return days;
  };

  // Generate mini calendar month
  const generateMiniCalendarDays = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    const days: (Date | null)[] = [];

    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null);
    }

    for (let day = 1; day <= daysInMonth; day++) {
      days.push(new Date(year, month, day));
    }

    return days;
  };

  // Get events for a specific date
  const getEventsForDate = (date: Date) => {
    // Use local date formatting to avoid timezone issues
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const dateString = `${year}-${month}-${day}`;
    return events.filter(event => event.event_date === dateString);
  };

  // Check if date is today
  const isToday = (date: Date) => {
    const today = new Date();
    return date.toDateString() === today.toDateString();
  };

  // Calendar hours: 7 AM to 10 PM (22:00) every day
  const getTimeSlotsForDate = () => {
    const startHour = 7;
    const endHour = 22;
    const hours = endHour - startHour;
    return Array.from({ length: hours }, (_, i) => startHour + i);
  };

  // Get event position on grid
  const getEventStyle = (event: CalendarEvent) => {
    if (!event.start_time) return null;

    const [startHour, startMinute] = event.start_time.split(':').map(Number);
    // Each hour block is 64px tall (h-16 class)
    const pixelsPerHour = 64;
    // Position within the hour cell (0-64px based on minutes)
    const top = (startMinute / 60) * pixelsPerHour;

    let height = pixelsPerHour; // Default 1 hour
    if (event.end_time) {
      const [endHour, endMinute] = event.end_time.split(':').map(Number);
      const endMinutes = endHour * 60 + endMinute;
      const startMinutes = startHour * 60 + startMinute;
      const durationMinutes = endMinutes - startMinutes;
      height = (durationMinutes / 60) * pixelsPerHour;
    }

    return { top: `${top}px`, height: `${height}px` };
  };

  // Get current time indicator position
  const getCurrentTimePosition = () => {
    const hours = currentTime.getHours();
    const minutes = currentTime.getMinutes();
    // Grid starts at 5 AM for week view, 7 AM for day view
    const gridStartHour = view === 'week' ? 5 : 7;
    // Each hour block is 64px tall (h-16 class)
    const pixelsPerHour = 64;
    const totalPixels = (hours - gridStartHour) * pixelsPerHour + (minutes / 60) * pixelsPerHour;
    return totalPixels;
  };

  // Check if a date is today for time indicator
  const isTodayForTimeIndicator = (date: Date) => {
    const today = new Date();
    return date.toDateString() === today.toDateString();
  };

  const weekDays = generateWeekDays();
  const miniCalendarDays = generateMiniCalendarDays();

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const dayNamesShort = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
  const dayNamesFull = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];

  const currentMonth = monthNames[currentDate.getMonth()];
  const currentYear = currentDate.getFullYear();

  if (loading) {
    return (
      <DashboardLayout userEmail={userEmail}>
        <div className="flex h-screen items-center justify-center bg-slate-900">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-slate-400">Loading calendar...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout userEmail={userEmail}>
      {error && (
        <div className="bg-red-900/20 border border-red-500 text-red-300 px-4 py-3 rounded relative mb-4 mx-4 mt-4">
          <span className="block sm:inline">{error}</span>
          <button
            onClick={() => setError(null)}
            className="absolute top-0 bottom-0 right-0 px-4 py-3"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}
      <div className="flex h-screen bg-slate-900">
        {/* Left Sidebar */}
        <div className="w-64 border-r border-slate-700 flex flex-col">
          {/* Create Button */}
          <div className="p-4">
            <button
              onClick={() => {
                setEditingEvent(null);
                setEventForm({ title: '', description: '', event_date: '', start_time: '', end_time: '' });
                setShowEventModal(true);
              }}
              className="w-full flex items-center space-x-3 px-6 py-3 bg-primary hover:bg-primary-dark text-white rounded-full transition-colors shadow-lg"
            >
              <Plus className="w-5 h-5" />
              <span className="font-semibold">Create</span>
            </button>
          </div>

          {/* Mini Calendar */}
          <div className="px-4 mb-4">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-semibold text-white">
                {currentMonth} {currentYear}
              </span>
              <div className="flex space-x-1">
                <button
                  onClick={goToPrevious}
                  className="p-1 hover:bg-slate-700 rounded transition-colors"
                >
                  <ChevronLeft className="w-4 h-4 text-slate-400" />
                </button>
                <button
                  onClick={goToNext}
                  className="p-1 hover:bg-slate-700 rounded transition-colors"
                >
                  <ChevronRight className="w-4 h-4 text-slate-400" />
                </button>
              </div>
            </div>

            <div className="grid grid-cols-7 gap-1 mb-2">
              {dayNamesShort.map(day => (
                <div key={day} className="text-center text-xs text-slate-500 font-medium">
                  {day}
                </div>
              ))}
            </div>

            <div className="grid grid-cols-7 gap-1">
              {miniCalendarDays.map((date, index) => (
                <button
                  key={index}
                  onClick={() => date && setCurrentDate(date)}
                  className={`aspect-square flex items-center justify-center text-xs rounded-full transition-colors ${
                    date
                      ? isToday(date)
                        ? 'bg-primary text-white font-bold'
                        : 'text-slate-300 hover:bg-slate-700'
                      : ''
                  }`}
                >
                  {date?.getDate()}
                </button>
              ))}
            </div>
          </div>

          {/* Tasks Section */}
          <div className="flex-1 overflow-y-auto px-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-white flex items-center">
                <input type="checkbox" className="mr-2 accent-primary" defaultChecked />
                Tasks
              </h3>
              <button
                onClick={() => setShowTodoModal(true)}
                className="text-slate-400 hover:text-white"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2">
              {todos.map(todo => (
                <div
                  key={todo.id}
                  className="flex items-start space-x-2 text-sm group"
                >
                  <button
                    onClick={() => toggleTodo(todo.id, todo.completed)}
                    className={`mt-0.5 flex-shrink-0 w-4 h-4 rounded border-2 flex items-center justify-center transition-colors ${
                      todo.completed
                        ? 'bg-primary border-primary'
                        : 'border-slate-500 hover:border-primary'
                    }`}
                  >
                    {todo.completed && <Check className="w-3 h-3 text-white" />}
                  </button>
                  <span
                    className={`flex-1 ${
                      todo.completed
                        ? 'line-through text-slate-500'
                        : 'text-slate-300'
                    }`}
                  >
                    {todo.title}
                  </span>
                  <button
                    onClick={() => deleteTodo(todo.id)}
                    className="opacity-0 group-hover:opacity-100 flex-shrink-0 p-0.5 hover:bg-red-600 hover:text-white text-slate-400 rounded transition-opacity"
                    title="Delete task"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Main Calendar Area */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Header */}
          <div className="border-b border-slate-700 px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <button
                  onClick={goToToday}
                  className="px-4 py-2 border border-slate-600 hover:bg-slate-700 text-white rounded-lg transition-colors text-sm"
                >
                  Today
                </button>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={goToPrevious}
                    className="p-2 hover:bg-slate-700 rounded transition-colors"
                  >
                    <ChevronLeft className="w-5 h-5 text-slate-300" />
                  </button>
                  <button
                    onClick={goToNext}
                    className="p-2 hover:bg-slate-700 rounded transition-colors"
                  >
                    <ChevronRight className="w-5 h-5 text-slate-300" />
                  </button>
                </div>
                <h2 className="text-xl font-normal text-white">
                  {currentMonth} {currentYear}
                </h2>
              </div>

              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setView('week')}
                  className={`px-4 py-2 rounded-lg text-sm transition-colors ${
                    view === 'week'
                      ? 'bg-slate-700 text-white'
                      : 'text-slate-400 hover:bg-slate-800'
                  }`}
                >
                  Week
                </button>
                <button
                  onClick={() => setView('day')}
                  className={`px-4 py-2 rounded-lg text-sm transition-colors ${
                    view === 'day'
                      ? 'bg-slate-700 text-white'
                      : 'text-slate-400 hover:bg-slate-800'
                  }`}
                >
                  Day
                </button>
              </div>
            </div>
          </div>

          {/* Calendar Grid */}
          <div className="flex-1 overflow-auto">
            <div className="min-w-max">
              {/* Day Headers */}
              <div className="grid grid-cols-8 border-b border-slate-700 sticky top-0 bg-slate-900 z-10">
                <div className="w-16"></div>
                {(view === 'week' ? weekDays : [currentDate]).map((date, index) => (
                  <div
                    key={index}
                    className="text-center py-3 px-4 border-l border-slate-700"
                  >
                    <div className="text-xs text-slate-400 mb-1">
                      {dayNamesFull[date.getDay()]}
                    </div>
                    <div
                      className={`inline-flex items-center justify-center w-10 h-10 rounded-full ${
                        isToday(date)
                          ? 'bg-primary text-white font-bold'
                          : 'text-white'
                      }`}
                    >
                      {date.getDate()}
                    </div>
                  </div>
                ))}
              </div>

              {/* Time Grid */}
              <div className="relative">
                {/* Current Time Indicator - Red Line */}
                {(view === 'week' ? weekDays : [currentDate]).map((date, dayIndex) => {
                  if (!isTodayForTimeIndicator(date)) return null;

                  const currentTimePos = getCurrentTimePosition();
                  const columnIndex = dayIndex + 1; // +1 for the time label column

                  return (
                    <div
                      key={`time-indicator-${dayIndex}`}
                      className="absolute z-30 pointer-events-none"
                      style={{
                        top: `${currentTimePos}px`,
                        left: `calc(${(columnIndex / 8) * 100}%)`,
                        width: `calc(${(1 / 8) * 100}%)`,
                      }}
                    >
                      {/* Red circle at the start */}
                      <div className="absolute -left-1 -top-1.5 w-3 h-3 bg-red-500 rounded-full border-2 border-slate-900"></div>
                      {/* Red line */}
                      <div className="w-full h-0.5 bg-red-500"></div>
                    </div>
                  );
                })}

                {(view === 'week' ? Array.from({ length: 24 - 5 }, (_, i) => 5 + i) : getTimeSlotsForDate()).map((hour) => (
                  <div key={hour} className="grid grid-cols-8 border-b border-slate-700">
                    <div className="w-16 text-right pr-2 text-xs text-slate-500 py-2">
                      {hour === 0 ? '12 AM' : hour === 12 ? '12 PM' : hour > 12 ? `${hour - 12} PM` : `${hour} AM`}
                    </div>
                    {(view === 'week' ? weekDays : [currentDate]).map((date, index) => (
                      <div
                        key={index}
                        className="relative h-16 border-l border-slate-700 hover:bg-slate-800/30 cursor-pointer overflow-visible"
                        onClick={() => {
                          // Use local date formatting to avoid timezone issues
                          const year = date.getFullYear();
                          const month = String(date.getMonth() + 1).padStart(2, '0');
                          const day = String(date.getDate()).padStart(2, '0');
                          const dateString = `${year}-${month}-${day}`;
                          setEventForm({
                            ...eventForm,
                            event_date: dateString,
                            start_time: `${hour.toString().padStart(2, '0')}:00`,
                          });
                          setShowEventModal(true);
                        }}
                      >
                        {/* Events for this time slot */}
                        {getEventsForDate(date)
                          .filter(event => {
                            if (!event.start_time) return false;
                            const eventHour = parseInt(event.start_time.split(':')[0]);
                            return eventHour === hour;
                          })
                          .map(event => {
                            const style = getEventStyle(event);
                            return style ? (
                              <div
                                key={event.id}
                                className="absolute left-1 right-1 bg-blue-600 text-white rounded px-2 py-1 text-xs overflow-hidden z-20 group hover:bg-blue-700 cursor-pointer"
                                style={style}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setEditingEvent(event);
                                  setEventForm({
                                    title: event.title,
                                    description: event.description || '',
                                    event_date: event.event_date,
                                    start_time: event.start_time || '',
                                    end_time: event.end_time || '',
                                  });
                                  setShowEventModal(true);
                                }}
                              >
                                <div className="flex items-start justify-between gap-1">
                                  <div className="flex-1 min-w-0">
                                    <div className="font-semibold truncate">{event.title}</div>
                                    {event.start_time && (
                                      <div className="text-xs opacity-90">
                                        {event.start_time.slice(0, 5)}
                                        {event.end_time && ` - ${event.end_time.slice(0, 5)}`}
                                      </div>
                                    )}
                                  </div>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      deleteEvent(event.id);
                                    }}
                                    className="opacity-0 group-hover:opacity-100 flex-shrink-0 p-0.5 hover:bg-red-600 rounded transition-opacity"
                                    title="Delete event"
                                  >
                                    <Trash2 className="w-3 h-3" />
                                  </button>
                                </div>
                              </div>
                            ) : null;
                          })}
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Add Todo Modal */}
      {showTodoModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-slate-800 rounded-lg max-w-md w-full p-6 border border-slate-700">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-white">Add Task</h3>
              <button
                onClick={() => setShowTodoModal(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            <form onSubmit={createTodo} className="space-y-4">
              <div>
                <input
                  type="text"
                  required
                  value={todoForm.title}
                  onChange={(e) => setTodoForm({ ...todoForm, title: e.target.value })}
                  className="w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:border-primary transition-colors"
                  placeholder="Task title"
                />
              </div>
              <div>
                <textarea
                  value={todoForm.description}
                  onChange={(e) => setTodoForm({ ...todoForm, description: e.target.value })}
                  rows={3}
                  className="w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:border-primary transition-colors resize-none"
                  placeholder="Description"
                />
              </div>
              <div>
                <input
                  type="date"
                  value={todoForm.due_date}
                  onChange={(e) => setTodoForm({ ...todoForm, due_date: e.target.value })}
                  className="w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-primary transition-colors"
                />
              </div>
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowTodoModal(false)}
                  disabled={submitting}
                  className="flex-1 px-6 py-3 bg-slate-700 hover:bg-slate-600 text-white font-semibold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 px-6 py-3 bg-primary hover:bg-primary-dark text-white font-semibold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                >
                  {submitting ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Adding...
                    </>
                  ) : (
                    'Add Task'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Event Modal */}
      {showEventModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-slate-800 rounded-lg max-w-md w-full p-6 border border-slate-700">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-white">
                {editingEvent ? 'Edit Event' : 'Add Event'}
              </h3>
              <button
                onClick={() => {
                  setShowEventModal(false);
                  setEditingEvent(null);
                }}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            <form onSubmit={createEvent} className="space-y-4">
              <div>
                <input
                  type="text"
                  required
                  value={eventForm.title}
                  onChange={(e) => setEventForm({ ...eventForm, title: e.target.value })}
                  className="w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:border-primary transition-colors"
                  placeholder="Event title"
                />
              </div>
              <div>
                <textarea
                  value={eventForm.description}
                  onChange={(e) => setEventForm({ ...eventForm, description: e.target.value })}
                  rows={2}
                  className="w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:border-primary transition-colors resize-none"
                  placeholder="Description"
                />
              </div>
              <div>
                <input
                  type="date"
                  required
                  value={eventForm.event_date}
                  onChange={(e) => setEventForm({ ...eventForm, event_date: e.target.value })}
                  className="w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-primary transition-colors"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm text-slate-400 mb-1">Start</label>
                  <input
                    type="time"
                    value={eventForm.start_time}
                    onChange={(e) => setEventForm({ ...eventForm, start_time: e.target.value })}
                    className="w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-primary transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-sm text-slate-400 mb-1">End</label>
                  <input
                    type="time"
                    value={eventForm.end_time}
                    onChange={(e) => setEventForm({ ...eventForm, end_time: e.target.value })}
                    className="w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-primary transition-colors"
                  />
                </div>
              </div>
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowEventModal(false);
                    setEditingEvent(null);
                  }}
                  disabled={submitting}
                  className="flex-1 px-6 py-3 bg-slate-700 hover:bg-slate-600 text-white font-semibold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 px-6 py-3 bg-primary hover:bg-primary-dark text-white font-semibold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                >
                  {submitting ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      {editingEvent ? 'Updating...' : 'Saving...'}
                    </>
                  ) : (
                    editingEvent ? 'Update' : 'Save'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* AI Calendar Assistant */}
      <CalendarChat
        userId={userId}
        currentDate={`${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(currentDate.getDate()).padStart(2, '0')}`}
        events={events}
        todos={todos}
        onEventsUpdate={refreshCalendarData}
      />
    </DashboardLayout>
  );
}
