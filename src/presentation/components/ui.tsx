import { useRef, useState, type ReactNode } from 'react';
import {
  ActivityIndicator,
  Animated,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type StyleProp,
  type TextInputProps,
  type TextProps,
  type ViewStyle,
} from 'react-native';

import { colors, fonts, radius, rules, shadows, spacing, typography, type TypographyVariant } from '../theme';
import { Icon, type IconName } from './Icon';

// ─── Texto ──────────────────────────────────────────────────────────────────

interface AppTextProps extends TextProps {
  variant?: TypographyVariant;
  color?: string;
}

/** Todo texto do app passa por aqui para garantir a fonte da marca. */
export function AppText({ variant = 'body', color = colors.text, style, ...props }: AppTextProps) {
  return <Text {...props} style={[typography[variant], { color }, style]} />;
}

// ─── Botões ─────────────────────────────────────────────────────────────────

type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'danger' | 'ghost';

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: ButtonVariant;
  icon?: IconName;
  loading?: boolean;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
}

const BUTTON_FOREGROUND: Record<ButtonVariant, string> = {
  // Tinta escura sobre o âmbar: branco sobre âmbar reprova contraste.
  primary: colors.onPrimary,
  secondary: colors.primary,
  outline: colors.text,
  danger: colors.danger,
  ghost: colors.primary,
};

/**
 * Pressionar afunda a superfície: escala curta com mola contida, sem giro e
 * sem brilho. É o único movimento autorado do app, e ele diz "recebi o
 * toque" — não decora.
 */
export function Button({ title, onPress, variant = 'primary', icon, loading = false, disabled = false, style }: ButtonProps) {
  const isDisabled = disabled || loading;
  const foreground = BUTTON_FOREGROUND[variant];
  const press = useRef(new Animated.Value(0)).current;

  const animate = (to: number) =>
    Animated.spring(press, {
      toValue: to,
      useNativeDriver: true,
      speed: 40,
      bounciness: to === 0 ? 8 : 0,
    }).start();

  const stamp = {
    transform: [{ scale: press.interpolate({ inputRange: [0, 1], outputRange: [1, 0.975] }) }],
  };

  return (
    <Animated.View style={[stamp, style]}>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ disabled: isDisabled, busy: loading }}
        onPress={onPress}
        onPressIn={() => animate(1)}
        onPressOut={() => animate(0)}
        disabled={isDisabled}
        style={[
          styles.button,
          variant === 'primary' ? styles.buttonPrimary : buttonVariants[variant],
          variant === 'primary' && shadows.stamp,
          isDisabled && styles.disabled,
        ]}
      >
        <View style={styles.buttonContent}>
          {loading ? (
            <ActivityIndicator color={foreground} />
          ) : (
            <>
              {icon && <Icon name={icon} size={18} color={foreground} />}
              <AppText variant="button" color={foreground}>
                {title}
              </AppText>
            </>
          )}
        </View>
      </Pressable>
    </Animated.View>
  );
}

interface IconButtonProps {
  icon: IconName;
  onPress: () => void;
  accessibilityLabel: string;
  variant?: 'soft' | 'glass' | 'primary';
  size?: number;
}

/**
 * `glass` é o botão que pousa sobre foto. No mundo claro ele era um véu
 * branco; aqui é escuro, porque o ícone é claro — véu branco com ícone claro
 * é botão invisível, e foi exatamente o que aconteceu sobre a foto do animal.
 *
 * Escuro também é a escolha mais segura sobre foto qualquer: uma imagem clara
 * apaga um véu branco, e uma escura apaga o ícone claro que estaria nele.
 */
export function IconButton({ icon, onPress, accessibilityLabel, variant = 'soft', size = 44 }: IconButtonProps) {
  const background =
    variant === 'glass' ? 'rgba(14, 9, 7, 0.74)' : variant === 'primary' ? colors.primary : colors.surfaceAlt;
  const foreground = variant === 'primary' ? colors.onPrimary : colors.text;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      onPress={onPress}
      style={({ pressed }) => [
        styles.iconButton,
        { width: size, height: size, borderRadius: size / 2, backgroundColor: background },
        // Fio de contorno para o botão sobreviver também a uma foto escura.
        variant === 'glass' && { borderWidth: rules.hair, borderColor: 'rgba(247, 237, 228, 0.28)' },
        variant === 'primary' ? shadows.primary : shadows.card,
        pressed && styles.pressed,
      ]}
    >
      <Icon name={icon} size={size * 0.45} color={foreground} />
    </Pressable>
  );
}

// ─── Campos ─────────────────────────────────────────────────────────────────

interface TextFieldProps extends TextInputProps {
  label?: string;
  icon?: IconName;
  error?: string;
  trailing?: ReactNode;
}

export function TextField({ label, icon, error, trailing, style, onFocus, onBlur, ...inputProps }: TextFieldProps) {
  const [focused, setFocused] = useState(false);
  const multiline = Boolean(inputProps.multiline);

  return (
    <View style={styles.field}>
      {label ? (
        <AppText variant="label" color={colors.textSoft}>
          {label}
        </AppText>
      ) : null}
      <View
        style={[
          styles.inputWrap,
          multiline && styles.inputWrapMultiline,
          focused && styles.inputFocused,
          Boolean(error) && styles.inputError,
        ]}
      >
        {icon && <Icon name={icon} size={20} color={focused ? colors.primary : colors.textMuted} />}
        <TextInput
          placeholderTextColor={colors.placeholder}
          style={[styles.input, multiline && styles.inputMultiline, style]}
          onFocus={(event) => {
            setFocused(true);
            onFocus?.(event);
          }}
          onBlur={(event) => {
            setFocused(false);
            onBlur?.(event);
          }}
          {...inputProps}
        />
        {trailing}
      </View>
      {error ? (
        <View style={styles.errorRow}>
          <Icon name="alert" size={14} color={colors.danger} />
          <AppText variant="caption" color={colors.danger}>
            {error}
          </AppText>
        </View>
      ) : null}
    </View>
  );
}

export function PasswordField(props: Omit<TextFieldProps, 'secureTextEntry' | 'trailing'>) {
  const [visible, setVisible] = useState(false);
  return (
    <TextField
      icon="lock"
      autoCapitalize="none"
      {...props}
      secureTextEntry={!visible}
      trailing={
        <Pressable
          onPress={() => setVisible((value) => !value)}
          hitSlop={10}
          accessibilityLabel={visible ? 'Ocultar senha' : 'Mostrar senha'}
        >
          <Icon name={visible ? 'eyeOff' : 'eye'} size={20} color={colors.textMuted} />
        </Pressable>
      }
    />
  );
}

// ─── Seleção ────────────────────────────────────────────────────────────────

interface ChipProps {
  label: string;
  selected: boolean;
  onPress: () => void;
  icon?: IconName;
}

export function Chip({ label, selected, onPress, icon }: ChipProps) {
  // Selecionado o chip fica âmbar; branco sobre âmbar reprova contraste.
  const foreground = selected ? colors.onPrimary : colors.textSoft;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={({ pressed }) => [styles.chip, selected && styles.chipSelected, pressed && styles.pressed]}
    >
      {icon && <Icon name={icon} size={16} color={foreground} />}
      <AppText variant="label" color={foreground}>
        {label}
      </AppText>
    </Pressable>
  );
}

interface ChipSelectProps<T extends string> {
  label?: string;
  options: readonly T[];
  labels: Record<T, string>;
  value: T | null;
  onChange: (value: T | null) => void;
  /** Permite desmarcar a opção atual (útil para filtros e campos opcionais). */
  allowClear?: boolean;
  /** Adiciona um chip inicial que representa "nenhum filtro". */
  allLabel?: string;
  /** Rola na horizontal em vez de quebrar linha. */
  scroll?: boolean;
  icons?: Partial<Record<T, IconName>>;
  error?: string;
}

export function ChipSelect<T extends string>({
  label,
  options,
  labels,
  value,
  onChange,
  allowClear = false,
  allLabel,
  scroll = false,
  icons,
  error,
}: ChipSelectProps<T>) {
  const chips = (
    <>
      {allLabel && <Chip label={allLabel} selected={value === null} onPress={() => onChange(null)} />}
      {options.map((option) => {
        const selected = option === value;
        return (
          <Chip
            key={option}
            label={labels[option]}
            icon={icons?.[option]}
            selected={selected}
            onPress={() => onChange(selected && (allowClear || allLabel) ? null : option)}
          />
        );
      })}
    </>
  );

  return (
    <View style={styles.field}>
      {label ? (
        <AppText variant="label" color={colors.textSoft}>
          {label}
        </AppText>
      ) : null}
      {scroll ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsScroll}>
          {chips}
        </ScrollView>
      ) : (
        <View style={styles.chipsWrap}>{chips}</View>
      )}
      {error ? (
        <AppText variant="caption" color={colors.danger}>
          {error}
        </AppText>
      ) : null}
    </View>
  );
}

// ─── Estrutura ──────────────────────────────────────────────────────────────

export function Card({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

interface SectionHeaderProps {
  title: string;
  icon?: IconName;
  subtitle?: string;
  action?: { label: string; onPress: () => void };
}

export function SectionHeader({ title, icon, subtitle, action }: SectionHeaderProps) {
  return (
    <View style={styles.sectionHeader}>
      <View style={styles.sectionTitleRow}>
        {icon && (
          <View style={styles.sectionIcon}>
            <Icon name={icon} size={16} color={colors.primary} />
          </View>
        )}
        <View style={{ flex: 1 }}>
          <AppText variant="heading">{title}</AppText>
          {subtitle ? (
            <AppText variant="caption" color={colors.textMuted}>
              {subtitle}
            </AppText>
          ) : null}
        </View>
      </View>
      {action && (
        <Pressable onPress={action.onPress} hitSlop={8}>
          <AppText variant="label" color={colors.primary}>
            {action.label}
          </AppText>
        </Pressable>
      )}
    </View>
  );
}

export function Pill({ label, icon, background, color }: { label: string; icon?: IconName; background: string; color: string }) {
  return (
    <View style={[styles.pill, { backgroundColor: background }]}>
      {icon && <Icon name={icon} size={13} color={color} />}
      <AppText variant="label" color={color} style={styles.pillText}>
        {label}
      </AppText>
    </View>
  );
}

/** Tons de iniciais para avatar, todos legíveis sobre a superfície quente. */
const AVATAR_INKS = ['#FF7A45', '#E8D5BE', '#F2C94C', '#62BFEA', '#C3A2F0'] as const;

export function Avatar({ name, size = 44 }: { name: string; size?: number }) {
  const initials = name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]!.toUpperCase())
    .join('');
  const ink = AVATAR_INKS[name.length % AVATAR_INKS.length]!;
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: colors.surfaceAlt,
        borderWidth: rules.hair,
        borderColor: colors.border,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Text style={{ fontFamily: fonts.semibold, fontSize: size * 0.36, color: ink }}>{initials}</Text>
    </View>
  );
}

interface ListItemProps {
  icon: IconName;
  title: string;
  subtitle?: string;
  onPress: () => void;
  danger?: boolean;
}

export function ListItem({ icon, title, subtitle, onPress, danger = false }: ListItemProps) {
  const tint = danger ? colors.danger : colors.primary;
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.listItem, pressed && { backgroundColor: colors.surfaceAlt }]}>
      <View style={[styles.listIcon, { backgroundColor: danger ? colors.dangerSoft : colors.primarySoft }]}>
        <Icon name={icon} size={18} color={tint} />
      </View>
      <View style={{ flex: 1 }}>
        <AppText variant="bodyStrong" color={danger ? colors.danger : colors.text}>
          {title}
        </AppText>
        {subtitle ? (
          <AppText variant="caption" color={colors.textMuted}>
            {subtitle}
          </AppText>
        ) : null}
      </View>
      {!danger && <Icon name="chevronRight" size={16} color={colors.textMuted} />}
    </Pressable>
  );
}

// ─── Feedback ───────────────────────────────────────────────────────────────

interface EmptyStateProps {
  title: string;
  message?: string;
  action?: { label: string; onPress: () => void };
}

export function EmptyState({ title, message, action }: EmptyStateProps) {
  return (
    <View style={styles.empty}>
      <View style={styles.emptyIllustration}>
        <Icon name="search" size={30} color={colors.textMuted} />
      </View>
      <AppText variant="heading" style={styles.centerText}>
        {title}
      </AppText>
      {message ? (
        <AppText variant="body" color={colors.textMuted} style={styles.centerText}>
          {message}
        </AppText>
      ) : null}
      {action && <Button title={action.label} variant="secondary" onPress={action.onPress} style={{ marginTop: spacing.sm }} />}
    </View>
  );
}

export function FormError({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <View style={styles.formError}>
      <Icon name="alert" size={18} color={colors.danger} />
      <AppText variant="bodyStrong" color={colors.danger} style={{ flex: 1 }}>
        {message}
      </AppText>
    </View>
  );
}

const buttonVariants = StyleSheet.create({
  secondary: { backgroundColor: colors.primarySoft },
  outline: { backgroundColor: colors.surfaceAlt, borderWidth: rules.hair, borderColor: colors.borderStrong },
  danger: { backgroundColor: colors.dangerSoft },
  ghost: { backgroundColor: 'transparent' },
});

const styles = StyleSheet.create({
  // 56dp: acima do piso de 44pt do iOS e de 48dp do Android com folga.
  button: { minHeight: 56, borderRadius: radius.lg, overflow: 'hidden', justifyContent: 'center' },
  buttonPrimary: { backgroundColor: colors.primary },
  buttonContent: {
    minHeight: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.xl,
  },
  pressed: { opacity: 0.7 },
  disabled: { opacity: 0.45 },
  iconButton: { alignItems: 'center', justifyContent: 'center' },
  field: { gap: 6, marginBottom: spacing.lg },
  // Superfície de vidro sobre a tinta: a elevação separa o campo do fundo.
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    minHeight: 56,
    backgroundColor: colors.surfaceAlt,
    borderWidth: rules.hair,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.lg,
  },
  inputWrapMultiline: { alignItems: 'flex-start', paddingVertical: spacing.md },
  inputFocused: { borderColor: colors.primary },
  inputError: { borderColor: colors.danger },
  input: { flex: 1, fontFamily: fonts.semibold, fontSize: 16, color: colors.text, paddingVertical: spacing.md },
  inputMultiline: { minHeight: 96, textAlignVertical: 'top', paddingVertical: 0 },
  errorRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    minHeight: 40,
    paddingHorizontal: spacing.lg,
    paddingVertical: 9,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceAlt,
    borderWidth: rules.hair,
    borderColor: colors.border,
  },
  chipSelected: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  chipsScroll: { gap: spacing.sm, paddingRight: spacing.lg },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: rules.hair,
    borderColor: colors.border,
    padding: spacing.lg,
  },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.md, marginBottom: spacing.md },
  sectionTitleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flex: 1 },
  sectionIcon: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pill: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', gap: 4, borderRadius: radius.sm, paddingHorizontal: 8, paddingVertical: 4 },
  pillText: { fontSize: 12, lineHeight: 16 },
  listItem: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: spacing.md, paddingHorizontal: spacing.lg },
  listIcon: { width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  empty: { alignItems: 'center', paddingVertical: spacing.xxl, paddingHorizontal: spacing.xl, gap: spacing.sm },
  emptyIllustration: {
    width: 84,
    height: 84,
    borderRadius: 42,
    backgroundColor: colors.surfaceAlt,
    borderWidth: rules.hair,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  centerText: { textAlign: 'center' },
  formError: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.dangerSoft,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.lg,
  },
});
