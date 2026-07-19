import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseClient = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function POST(request: NextRequest) {
  try {
    const { email, eleveIds, establishmentId } = await request.json();

    if (!email || !eleveIds || eleveIds.length === 0 || !establishmentId) {
      return NextResponse.json(
        { error: 'Email, eleveIds, and establishmentId are required' },
        { status: 400 }
      );
    }

    // Verify the request comes from an authenticated admin/directeur
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const token = authHeader.replace('Bearer ', '');

    // Verify user is admin or directeur
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError || !user) {
      return NextResponse.json(
        { error: 'Invalid token' },
        { status: 401 }
      );
    }

    // Check user's role
    const { data: profile, error: profileError } = await supabaseClient
      .from('profiles')
      .select('role, etablissement_id')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      return NextResponse.json(
        { error: 'Profile not found' },
        { status: 404 }
      );
    }

    if (!['admin', 'directeur'].includes(profile.role)) {
      return NextResponse.json(
        { error: 'Only admin or directeur can create parent accounts' },
        { status: 403 }
      );
    }

    if (profile.etablissement_id !== establishmentId) {
      return NextResponse.json(
        { error: 'Cannot create accounts for another establishment' },
        { status: 403 }
      );
    }

    // Create Supabase auth user via admin API
    const createUserResponse = await fetch(
      `${process.env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/admin/users`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.SUPABASE_ACCESS_TOKEN}`
        },
        body: JSON.stringify({
          email,
          password: Math.random().toString(36).slice(-12),
          email_confirm: false,
          user_metadata: {
            etablissement_id: establishmentId
          }
        })
      }
    );

    if (!createUserResponse.ok) {
      const errorData = await createUserResponse.json();
      return NextResponse.json(
        { error: `Failed to create auth user: ${errorData.msg || errorData.message || 'Unknown error'}` },
        { status: 500 }
      );
    }

    const authUser = await createUserResponse.json();
    const userId = authUser.id;

    // Create profile with role='parent'
    const { error: profileCreateError } = await supabaseClient
      .from('profiles')
      .insert({
        id: userId,
        email,
        role: 'parent',
        etablissement_id: establishmentId,
        nom: email.split('@')[0],
        prenom: ''
      });

    if (profileCreateError) {
      // Clean up auth user if profile creation fails
      await fetch(
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/admin/users/${userId}`,
        {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${process.env.SUPABASE_ACCESS_TOKEN}`
          }
        }
      );
      return NextResponse.json(
        { error: `Failed to create profile: ${profileCreateError.message}` },
        { status: 500 }
      );
    }

    // Link parent to eleves via parent_eleves junction table
    const links = eleveIds.map((eleveId: string) => ({
      parent_id: userId,
      eleve_id: eleveId
    }));

    const { error: linksError } = await supabaseClient
      .from('parent_eleves')
      .insert(links);

    if (linksError) {
      // Clean up on failure
      await supabaseClient
        .from('profiles')
        .delete()
        .eq('id', userId);
      await fetch(
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/admin/users/${userId}`,
        {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${process.env.SUPABASE_ACCESS_TOKEN}`
          }
        }
      );

      return NextResponse.json(
        { error: `Failed to link parent to children: ${linksError.message}` },
        { status: 500 }
      );
    }

    // Send invitation email via admin API
    const inviteResponse = await fetch(
      `${process.env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/admin/users/${userId}/send_recovery_email`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.SUPABASE_ACCESS_TOKEN}`
        }
      }
    );

    if (!inviteResponse.ok) {
      console.warn(`Failed to send invitation email to ${email}`);
    }

    return NextResponse.json({
      success: true,
      userId,
      email,
      eleveIds,
      message: `Parent account created for ${email}. Invitation email sent.`
    });
  } catch (error) {
    console.error('Error creating parent account:', error);
    return NextResponse.json(
      { error: `Server error: ${error instanceof Error ? error.message : 'Unknown'}` },
      { status: 500 }
    );
  }
}
