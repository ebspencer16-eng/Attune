/**
 * Invite your partner, in the app (A206).
 *
 * Ellie: someone who chose "I will invite my partner later" at checkout
 * "need[s] to be prompted in their dashboard to invite their partner". The
 * home card for that (api/_lib/next-action.js, `invite-partner`) opens
 * Settings with this at the top. The words come from the server
 * (api/_lib/invite-copy.js), the same ones the website's Account page uses.
 */
import { useEffect, useState } from 'react';
import { Text, TextInput, View } from 'react-native';
import { Pressable } from '@/components/pressable';

import { fetchInviteCopy, invitePartner, type InviteCopy } from '@/api/client';
import { Colors, Palette, Radius, Spacing, Type, inputType } from '@/constants/attune-theme';

const c = Colors.light;

export default function PartnerInvite() {
  const [copy, setCopy] = useState<InviteCopy | null>(null);
  const [email, setEmail] = useState('');
  const [state, setState] = useState<'idle' | 'sending' | 'sent' | 'failed' | 'soon'>('idle');

  useEffect(() => {
    let live = true;
    fetchInviteCopy().then((r) => { if (live && r.ok) setCopy(r.data.copy); });
    return () => { live = false; };
  }, []);

  if (!copy) return null;

  const send = async () => {
    if (state === 'sending' || !email.trim()) return;
    setState('sending');
    const r = await invitePartner(email);
    if (r.ok) { setState('sent'); return; }
    setState(r.error.kind === 'server' && r.error.status === 429 ? 'soon' : 'failed');
  };

  return (
    <View>
      <Text style={{ ...Type.eyebrow, color: c.accentQuiet, marginBottom: Spacing.sm }}>{copy.heading}</Text>
      {state === 'sent' ? (
        <Text style={{ ...Type.body, color: c.textStrong }}>{copy.sent.replace('{email}', email.trim().toLowerCase())}</Text>
      ) : (
        <>
          <Text style={{ ...Type.small, color: c.textMuted, lineHeight: 20 }}>{copy.line.replace('{partner}', 'your partner')}</Text>
          <TextInput
            value={email}
            onChangeText={(t) => { setEmail(t); if (state !== 'sending') setState('idle'); }}
            placeholder={copy.placeholder}
            placeholderTextColor={c.textMuted}
            accessibilityLabel={copy.label}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            style={{
              ...inputType(Type.body), color: c.textStrong, borderColor: c.border, borderWidth: 1,
              borderRadius: Radius.md, paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, marginTop: Spacing.md,
            }}
          />
          {state === 'failed' || state === 'soon' ? (
            <Text style={{ ...Type.small, color: '#B4463A', marginTop: Spacing.md }}>{state === 'soon' ? copy.soon : copy.failed}</Text>
          ) : null}
          <Pressable
            accessibilityRole="button"
            disabled={state === 'sending' || !email.trim()}
            onPress={send}
            style={{
              marginTop: Spacing.lg, paddingVertical: Spacing.md, borderRadius: Radius.md, alignItems: 'center',
              backgroundColor: email.trim() && state !== 'sending' ? c.accent : c.border,
            }}>
            <Text style={{ ...Type.small, fontWeight: '700', color: email.trim() && state !== 'sending' ? Palette.white : c.textMuted }}>
              {state === 'sending' ? copy.sending : copy.button}
            </Text>
          </Pressable>
        </>
      )}
    </View>
  );
}
