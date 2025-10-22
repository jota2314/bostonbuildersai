'use client';

import { useState } from 'react';
import { ChevronLeft, ChevronRight, Clock, Check, X } from 'lucide-react';

interface BookingCalendarProps {
  onClose: () => void;
}

interface FormData {
  name: string;
  email: string;
  phone: string;
  company: string;
}

export default function BookingCalendar({ onClose }: BookingCalendarProps) {
  const [step, setStep] = useState<'form' | 'calendar' | 'confirmation'>('form');
  const [formData, setFormData] = useState<FormData>({
    name: '',
    email: '',
    phone: '',
    company: '',
  });
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedTime, setSelectedTime] = useState<string>('');
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [availableSlots, setAvailableSlots] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Generate calendar days
  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    const days = [];

    // Add empty cells for days before month starts
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null);
    }

    // Add all days in month
    for (let day = 1; day <= daysInMonth; day++) {
      days.push(new Date(year, month, day));
    }

    return days;
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatDateForAPI = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const isDateDisabled = (date: Date | null) => {
    if (!date) return true;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return date < today;
  };

  const handleDateSelect = async (date: Date) => {
    setSelectedDate(date);
    setSelectedTime('');
    setIsLoading(true);

    // Fetch available slots for this date
    try {
      const dateStr = formatDateForAPI(date);

      // Call the check_availability endpoint directly
      const response = await fetch('/api/check-availability', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date: dateStr })
      });

      if (response.ok) {
        const data = await response.json();

        // Extract time slots from the response
        if (data.slots && Array.isArray(data.slots)) {
          const times = data.slots.map((slot: { time: string }) => slot.time);
          setAvailableSlots(times);
        } else if (data.message && data.message.includes('TIMESLOTS:')) {
          // Parse TIMESLOTS from message
          const match = data.message.match(/TIMESLOTS:\[(.*?)\]/);
          if (match) {
            const slots = JSON.parse('[' + match[1] + ']');
            const times = slots.map((slot: { time: string }) => slot.time);
            setAvailableSlots(times);
          }
        } else {
          setAvailableSlots([]);
        }
      } else {
        console.error('Error response:', response.status);
        setAvailableSlots([]);
      }
    } catch (error) {
      console.error('Error fetching slots:', error);
      setAvailableSlots([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleTimeSelect = (time: string) => {
    setSelectedTime(time);
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.name && formData.email && formData.phone && formData.company) {
      setStep('calendar');
    }
  };

  const handleBooking = async () => {
    if (!selectedDate || !selectedTime) return;

    setIsLoading(true);
    try {
      // Calculate end time (1 hour after start)
      const [hours, minutes] = selectedTime.split(':');
      const endHour = parseInt(hours) + 1;
      const endTime = `${String(endHour).padStart(2, '0')}:${minutes}`;

      // Create the booking
      const response = await fetch('/api/book-appointment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          email: formData.email,
          phone: formData.phone,
          company: formData.company,
          date: formatDateForAPI(selectedDate),
          start_time: selectedTime,
          end_time: endTime,
          purpose: 'Discovery call'
        })
      });

      if (response.ok) {
        setStep('confirmation');
      } else {
        const error = await response.json();
        console.error('Booking error:', error);
        alert('Error booking appointment. Please try again.');
      }
    } catch (error) {
      console.error('Error booking:', error);
      alert('Error booking appointment. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const formatTimeSlot = (time: string) => {
    const [hours, minutes] = time.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour > 12 ? hour - 12 : (hour === 0 ? 12 : hour);
    return `${displayHour}:${minutes} ${ampm}`;
  };

  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'];

  const days = getDaysInMonth(currentMonth);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 z-50 flex items-center justify-center p-4">
      <div className="bg-slate-900 rounded-2xl max-w-6xl w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-slate-700">
        {/* Header */}
        <div className="bg-gradient-to-r from-primary to-primary-dark p-8 text-white relative">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-white hover:bg-white hover:bg-opacity-20 rounded-full p-2 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
          <h2 className="text-3xl font-bold mb-2">Book a Meeting with Jorge</h2>
          <p className="text-blue-100">Let&apos;s discuss how Boston Builders AI can help grow your business</p>
        </div>

        <div className="p-8">
          {/* Step 1: Contact Form */}
          {step === 'form' && (
            <div className="max-w-2xl mx-auto">
              <h3 className="text-2xl font-bold text-slate-100 mb-6">Enter your details</h3>
              <form onSubmit={handleFormSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-4 py-3 bg-slate-800 border border-slate-700 text-slate-100 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
                    placeholder="John Doe"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Email *
                  </label>
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-4 py-3 bg-slate-800 border border-slate-700 text-slate-100 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
                    placeholder="john@company.com"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Phone Number *
                  </label>
                  <input
                    type="tel"
                    required
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full px-4 py-3 bg-slate-800 border border-slate-700 text-slate-100 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
                    placeholder="(555) 123-4567"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Company Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.company}
                    onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                    className="w-full px-4 py-3 bg-slate-800 border border-slate-700 text-slate-100 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
                    placeholder="Your Company Inc."
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-4 bg-primary hover:bg-primary-dark text-white font-bold rounded-lg transition-colors text-lg mt-6"
                >
                  Continue to Calendar
                </button>
              </form>
            </div>
          )}

          {/* Step 2: Calendar & Time Selection */}
          {step === 'calendar' && (
            <div className="grid md:grid-cols-2 gap-8">
              {/* Calendar */}
              <div>
                <div className="flex items-center justify-between mb-6">
                  <button
                    onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1))}
                    className="p-2 hover:bg-slate-800 rounded-full transition-colors"
                  >
                    <ChevronLeft className="w-6 h-6 text-slate-300" />
                  </button>
                  <h3 className="text-xl font-bold text-slate-100">
                    {monthNames[currentMonth.getMonth()]} {currentMonth.getFullYear()}
                  </h3>
                  <button
                    onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1))}
                    className="p-2 hover:bg-slate-800 rounded-full transition-colors"
                  >
                    <ChevronRight className="w-6 h-6 text-slate-300" />
                  </button>
                </div>

                {/* Calendar Grid */}
                <div className="grid grid-cols-7 gap-2 mb-2">
                  {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                    <div key={day} className="text-center text-sm font-medium text-slate-400 py-2">
                      {day}
                    </div>
                  ))}
                </div>

                <div className="grid grid-cols-7 gap-2">
                  {days.map((date, idx) => {
                    const isDisabled = isDateDisabled(date);
                    const isSelected = selectedDate && date &&
                      selectedDate.toDateString() === date.toDateString();

                    return (
                      <button
                        key={idx}
                        disabled={isDisabled || !date}
                        onClick={() => date && !isDisabled && handleDateSelect(date)}
                        className={`
                          aspect-square rounded-lg flex items-center justify-center text-sm font-medium
                          transition-all
                          ${!date ? 'invisible' : ''}
                          ${isDisabled ? 'text-slate-600 cursor-not-allowed' : 'hover:bg-slate-800 text-slate-300'}
                          ${isSelected ? 'bg-primary text-white hover:bg-primary-dark' : ''}
                        `}
                      >
                        {date && date.getDate()}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Time Slots */}
              <div>
                {selectedDate ? (
                  <>
                    <h3 className="text-xl font-bold text-slate-100 mb-4">
                      {formatDate(selectedDate)}
                    </h3>

                    {isLoading ? (
                      <div className="flex items-center justify-center py-12">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
                      </div>
                    ) : (
                      <div className="space-y-3 max-h-96 overflow-y-auto">
                        {availableSlots.length === 0 ? (
                          <div className="text-center py-12 text-slate-400">
                            <p>No available slots for this date</p>
                          </div>
                        ) : (
                          availableSlots.map(slot => (
                            <button
                              key={slot}
                              onClick={() => handleTimeSelect(slot)}
                              className={`
                                w-full px-4 py-3 rounded-lg font-medium transition-all
                                flex items-center justify-center space-x-2
                                ${selectedTime === slot
                                  ? 'bg-primary text-white'
                                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700 border border-slate-700'
                                }
                              `}
                            >
                              <Clock className="w-4 h-4" />
                              <span>{formatTimeSlot(slot)}</span>
                            </button>
                          ))
                        )}
                      </div>
                    )}

                    {selectedTime && (
                      <button
                        onClick={handleBooking}
                        disabled={isLoading}
                        className="w-full mt-6 py-4 bg-primary hover:bg-primary-dark text-white font-bold rounded-lg transition-colors disabled:opacity-50"
                      >
                        {isLoading ? 'Booking...' : 'Confirm Booking'}
                      </button>
                    )}
                  </>
                ) : (
                  <div className="flex items-center justify-center h-full text-slate-400">
                    <div className="text-center">
                      <Clock className="w-16 h-16 mx-auto mb-4 opacity-50" />
                      <p>Select a date to see available times</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Step 3: Confirmation */}
          {step === 'confirmation' && (
            <div className="max-w-2xl mx-auto text-center py-12">
              <div className="w-20 h-20 bg-green-900/30 border border-green-600 rounded-full flex items-center justify-center mx-auto mb-6">
                <Check className="w-12 h-12 text-green-400" />
              </div>
              <h3 className="text-3xl font-bold text-slate-100 mb-4">You&apos;re all set!</h3>
              <p className="text-lg text-slate-300 mb-8">
                Your meeting with Jorge is confirmed for<br />
                <strong className="text-slate-100">{selectedDate && formatDate(selectedDate)}</strong> at <strong className="text-slate-100">{selectedTime && formatTimeSlot(selectedTime)}</strong>
              </p>
              <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-6 mb-8">
                <p className="text-slate-300 mb-4">
                  Check your email for:
                </p>
                <ul className="text-left text-slate-300 space-y-2 max-w-md mx-auto">
                  <li>✅ Calendar invite</li>
                  <li>✅ Google Meet link</li>
                  <li>✅ Reminders (1 day before & 15 min before)</li>
                </ul>
              </div>
              <button
                onClick={onClose}
                className="px-8 py-3 bg-primary hover:bg-primary-dark text-white font-bold rounded-lg transition-colors"
              >
                Close
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
