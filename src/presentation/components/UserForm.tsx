import { useState, type ReactNode } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { USER_ROLE_LABELS, USER_ROLES, type User, type UserRole } from '@/domain/entities/User';

import { describeError } from '../format';
import { colors, radius, roleStyles, spacing } from '../theme';
import { Icon } from './Icon';
import { AppText, Button, Card, FormError, PasswordField, SectionHeader, TextField } from './ui';

interface UserFormProps {
  initial?: User;
  submitLabel: string;
  /** Campo de senha só aparece na criação. */
  withPassword?: boolean;
  /** Seleção de perfil só aparece para administradores. */
  withRole?: boolean;
  onSubmit: (input: Record<string, unknown>) => Promise<void>;
  footer?: ReactNode;
}

export function UserForm({ initial, submitLabel, withPassword = false, withRole = false, onSubmit, footer }: UserFormProps) {
  const [name, setName] = useState(initial?.name ?? '');
  const [email, setEmail] = useState(initial?.email ?? '');
  const [phone, setPhone] = useState(initial?.phone ?? '');
  const [role, setRole] = useState<UserRole>(initial?.role ?? 'morador');
  const [password, setPassword] = useState('');
  const isEditing = initial !== undefined;

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  async function handleSubmit() {
    setSubmitting(true);
    setError(null);
    setFieldErrors({});
    try {
      await onSubmit({ name, email, phone, role, ...(withPassword ? { password } : {}) });
    } catch (err) {
      const described = describeError(err);
      setError(described.message);
      setFieldErrors(described.fieldErrors);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <FormError message={error} />

        <Card>
          <SectionHeader title="Dados pessoais" icon="person" />
          <TextField label="Nome completo" icon="person" value={name} onChangeText={setName} error={fieldErrors.name} />
          {/*
            O e-mail é a identidade da conta no Supabase Auth, não um campo do
            perfil: trocá-lo exige reconfirmação pelo fluxo de autenticação.
            Fica visível, mas travado, na edição.
          */}
          <TextField
            label="E-mail"
            icon="mail"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
            editable={!isEditing}
            style={isEditing ? { color: colors.textMuted } : undefined}
            error={fieldErrors.email}
          />
          {isEditing && (
            <AppText variant="caption" color={colors.textMuted}>
              O e-mail não pode ser alterado por aqui.
            </AppText>
          )}
          <TextField
            label="Telefone (opcional)"
            icon="phone"
            value={phone}
            onChangeText={setPhone}
            keyboardType="phone-pad"
            placeholder="(51) 99999-9999"
            error={fieldErrors.phone}
          />
          {withPassword && (
            <PasswordField label="Senha inicial" value={password} onChangeText={setPassword} error={fieldErrors.password} />
          )}
        </Card>

        {withRole && (
          <Card>
            <SectionHeader title="Perfil de acesso" icon="shield" />
            <View style={styles.roles}>
              {USER_ROLES.map((option) => {
                const tone = roleStyles[option];
                const selected = option === role;
                return (
                  <Pressable
                    key={option}
                    accessibilityRole="radio"
                    accessibilityState={{ selected }}
                    onPress={() => setRole(option)}
                    style={[styles.role, selected && { borderColor: tone.text, backgroundColor: tone.background }]}
                  >
                    <View style={[styles.roleIcon, { backgroundColor: selected ? colors.surface : tone.background }]}>
                      <Icon name={tone.icon} size={18} color={tone.text} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <AppText variant="subheading">{USER_ROLE_LABELS[option]}</AppText>
                      <AppText variant="caption" color={colors.textMuted}>
                        {tone.description}
                      </AppText>
                    </View>
                    {selected && <Icon name="check" size={20} color={tone.text} />}
                  </Pressable>
                );
              })}
            </View>
            {fieldErrors.role ? (
              <AppText variant="caption" color={colors.danger}>
                {fieldErrors.role}
              </AppText>
            ) : null}
          </Card>
        )}

        <Button title={submitLabel} icon="check" onPress={handleSubmit} loading={submitting} />
        {footer}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { padding: spacing.xl, paddingBottom: 56, gap: spacing.lg },
  roles: { gap: spacing.sm },
  role: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.border,
  },
  roleIcon: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
});
