import { NextResponse } from 'next/server';
import { createLead } from '@/lib/db-operations';
import type { LeadData } from '@/lib/types';

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const {
      company_name,
      contact_name,
      email,
      phone,
      business_type,
      annual_revenue,
      location,
      notes,
      source = 'website_form',
      consent_to_contact = false,
      consent_date,
      consent_ip_address,
    } = body;

    // Validate required fields
    if (!company_name || !contact_name || !email || !business_type) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Validate TCPA consent
    if (!consent_to_contact) {
      return NextResponse.json(
        { error: 'Consent to contact is required' },
        { status: 400 }
      );
    }

    // Prepare lead data
    const leadData: LeadData = {
      company_name,
      contact_name,
      email,
      phone: phone || null,
      business_type,
      annual_revenue: annual_revenue || null,
      location: location || null,
      notes: notes || null,
      source,
      status: 'new',
      priority: 'medium',
      user_id: process.env.USER_ID || null, // Assign to Jorge by default
      consent_to_contact,
      consent_date: consent_date || null,
      consent_ip_address: consent_ip_address || null,
    };

    // Create lead using shared utility
    const result = await createLead(leadData);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Failed to create lead' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, data: result.data }, { status: 201 });
  } catch (error) {
    console.error('Error in leads API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
