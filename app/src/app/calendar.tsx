/** 공유 캘린더 (스펙 §5-8). API 연동: 월별 일정 색 구분 + 선택일 아젠다 + 추가. */
import { useCallback, useMemo, useState } from 'react';
import { Alert, KeyboardAvoidingView, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import { createSchedule, deleteSchedule, listSchedules, type Schedule } from '@/api/couple';
import { useAuth } from '@/auth/AuthContext';
import { Icon } from '@/components/Icon';
import { colors, radius, weight } from '@/theme';

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'];
const OWNERS: { key: 'a' | 'b' | 'both'; label: string; tone: string }[] = [
  { key: 'a', label: '나', tone: colors.rose },
  { key: 'b', label: '상대', tone: colors.blue },
  { key: 'both', label: '함께', tone: colors.navy },
];
const toneOf = (o: string) => OWNERS.find((x) => x.key === o)?.tone ?? colors.sub;
const bgOf = (o: string) => (o === 'a' ? colors.roseBg : o === 'b' ? colors.blueBg : colors.navyBg);

function pad(n: number) {
  return String(n).padStart(2, '0');
}

export default function CalendarScreen() {
  const router = useRouter();
  const { token } = useAuth();
  const today = useMemo(() => new Date(), []);
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth()); // 0-based
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [selected, setSelected] = useState(today.getDate());
  const [adding, setAdding] = useState(false);
  const [title, setTitle] = useState('');
  const [owner, setOwner] = useState<'a' | 'b' | 'both'>('both');

  const monthStr = `${year}-${pad(month + 1)}`;

  const load = useCallback(async () => {
    if (!token) return;
    try {
      const r = await listSchedules(monthStr, token);
      setSchedules(r.items);
    } catch {
      setSchedules([]);
    }
  }, [token, monthStr]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const byDay = useMemo(() => {
    const map: Record<number, Schedule[]> = {};
    for (const s of schedules) {
      const day = Number(s.event_date.split('-')[2]);
      (map[day] ??= []).push(s);
    }
    return map;
  }, [schedules]);

  const firstWeekday = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: (number | null)[] = [];
  for (let i = 0; i < firstWeekday; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);

  const isToday = (d: number) =>
    d === today.getDate() && month === today.getMonth() && year === today.getFullYear();

  function shiftMonth(delta: number) {
    let m = month + delta;
    let y = year;
    if (m < 0) {
      m = 11;
      y -= 1;
    } else if (m > 11) {
      m = 0;
      y += 1;
    }
    setMonth(m);
    setYear(y);
    setSelected(1);
  }

  async function onAdd() {
    if (!token || !title.trim()) return;
    try {
      await createSchedule(
        { owner, title: title.trim(), event_date: `${year}-${pad(month + 1)}-${pad(selected)}` },
        token,
      );
      setTitle('');
      setAdding(false);
      await load();
    } catch {
      Alert.alert('일정', '추가에 실패했어요. 잠시 후 다시 시도해주세요.');
    }
  }

  async function onDelete(id: number) {
    if (!token) return;
    await deleteSchedule(id, token).catch(() => {});
    await load();
  }

  const selectedSchedules = byDay[selected] ?? [];

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.bar}>
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <Icon name="back" size={24} color={colors.ink} strokeWidth={1.9} />
        </Pressable>
        <Text style={styles.month}>
          {year}년 {month + 1}월
        </Text>
        <View style={styles.arrows}>
          <Pressable onPress={() => shiftMonth(-1)} hitSlop={6}>
            <Icon name="back" size={22} color={colors.ink} strokeWidth={2} />
          </Pressable>
          <Pressable onPress={() => shiftMonth(1)} hitSlop={6}>
            <Icon name="chevronRight" size={22} color={colors.ink} strokeWidth={2} />
          </Pressable>
        </View>
      </View>

      <View style={styles.legend}>
        {OWNERS.map((o) => (
          <View key={o.key} style={styles.lg}>
            <View style={[styles.lgDot, { backgroundColor: o.tone }]} />
            <Text style={styles.lgText}>{o.label}</Text>
          </View>
        ))}
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior="padding">
<ScrollView>
        <View style={styles.cal}>
          <View style={styles.weekhead}>
            {WEEKDAYS.map((w, i) => (
              <Text key={w} style={[styles.weekday, i === 0 && { color: colors.rose }]}>
                {w}
              </Text>
            ))}
          </View>
          <View style={styles.grid}>
            {cells.map((d, i) => (
              <Pressable
                key={i}
                style={[styles.cell, d === selected && styles.cellSelected]}
                disabled={d == null}
                onPress={() => d && setSelected(d)}>
                {d != null && (
                  <>
                    {isToday(d) ? (
                      <View style={styles.todayPill}>
                        <Text style={styles.todayText}>{d}</Text>
                      </View>
                    ) : (
                      <Text style={styles.dnum}>{d}</Text>
                    )}
                    {(byDay[d] ?? []).slice(0, 2).map((e) => (
                      <View key={e.id} style={[styles.evt, { backgroundColor: bgOf(e.owner) }]}>
                        <Text style={[styles.evtText, { color: toneOf(e.owner) }]} numberOfLines={1}>
                          {e.title}
                        </Text>
                      </View>
                    ))}
                    {(byDay[d]?.length ?? 0) > 2 && <Text style={styles.more}>+{byDay[d].length - 2}</Text>}
                  </>
                )}
              </Pressable>
            ))}
          </View>
        </View>

        <View style={styles.agenda}>
          <View style={styles.agendaHead}>
            <Text style={styles.ah}>
              {month + 1}월 {selected}일
            </Text>
            <Pressable onPress={() => setAdding((v) => !v)} hitSlop={8}>
              <Text style={styles.addToggle}>{adding ? '닫기' : '+ 일정'}</Text>
            </Pressable>
          </View>

          {adding && (
            <View style={styles.addBox}>
              <TextInput
                style={styles.addInput}
                placeholder="일정 제목"
                placeholderTextColor={colors.sub2}
                value={title}
                onChangeText={setTitle}
              />
              <View style={styles.ownerRow}>
                {OWNERS.map((o) => (
                  <Pressable
                    key={o.key}
                    style={[styles.ownerChip, owner === o.key && { backgroundColor: o.tone }]}
                    onPress={() => setOwner(o.key)}>
                    <Text style={[styles.ownerText, owner === o.key && { color: '#fff' }]}>{o.label}</Text>
                  </Pressable>
                ))}
                <Pressable style={styles.addBtn} onPress={onAdd}>
                  <Text style={styles.addBtnText}>추가</Text>
                </Pressable>
              </View>
            </View>
          )}

          {selectedSchedules.length === 0 ? (
            <Text style={styles.noEvt}>이 날은 일정이 없어요.</Text>
          ) : (
            selectedSchedules.map((s) => (
              <View key={s.id} style={styles.ev}>
                <View style={[styles.evBar, { backgroundColor: toneOf(s.owner) }]} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.evt2}>{s.title}</Text>
                  <Text style={styles.evm}>
                    {s.event_time ? `${s.event_time} · ` : ''}
                    {OWNERS.find((o) => o.key === s.owner)?.label}
                  </Text>
                </View>
                <Pressable onPress={() => onDelete(s.id)} hitSlop={8}>
                  <Text style={styles.del}>삭제</Text>
                </Pressable>
              </View>
            ))
          )}
        </View>
      </ScrollView>
</KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  bar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 10, paddingBottom: 6 },
  month: { fontSize: 18, fontWeight: weight.extrabold as '800', color: colors.ink, letterSpacing: -0.4 },
  arrows: { flexDirection: 'row', gap: 16 },
  legend: { flexDirection: 'row', gap: 14, paddingHorizontal: 22, paddingBottom: 14 },
  lg: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  lgDot: { width: 8, height: 8, borderRadius: 999 },
  lgText: { fontSize: 12, fontWeight: weight.semibold as '600', color: colors.sub },
  cal: { paddingHorizontal: 14 },
  weekhead: { flexDirection: 'row', marginBottom: 6 },
  weekday: { flex: 1, textAlign: 'center', fontSize: 11, fontWeight: weight.bold as '700', color: colors.sub, paddingVertical: 6 },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  cell: { width: `${100 / 7}%`, minHeight: 58, paddingHorizontal: 3, paddingTop: 5, borderRadius: 8 },
  cellSelected: { backgroundColor: colors.soft },
  dnum: { fontSize: 12, fontWeight: weight.semibold as '600', color: colors.ink, textAlign: 'center', marginBottom: 3 },
  todayPill: { width: 20, height: 20, borderRadius: 999, backgroundColor: colors.ink, alignSelf: 'center', alignItems: 'center', justifyContent: 'center', marginBottom: 3 },
  todayText: { fontSize: 12, fontWeight: weight.bold as '700', color: '#fff' },
  evt: { borderRadius: 4, paddingHorizontal: 3, paddingVertical: 2, marginBottom: 1.5 },
  evtText: { fontSize: 8.5, fontWeight: weight.bold as '700' },
  more: { fontSize: 8, color: colors.sub, fontWeight: weight.bold as '700', paddingLeft: 3 },
  agenda: { paddingHorizontal: 22, paddingTop: 18, paddingBottom: 40, borderTopWidth: 8, borderTopColor: colors.soft, marginTop: 14 },
  agendaHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  ah: { fontSize: 13, fontWeight: weight.extrabold as '800', color: colors.sub },
  addToggle: { fontSize: 13, fontWeight: weight.bold as '700', color: colors.rose },
  addBox: { backgroundColor: colors.soft, borderRadius: radius.card, padding: 12, marginBottom: 12 },
  addInput: { backgroundColor: colors.bg, borderRadius: radius.button, paddingHorizontal: 12, height: 42, fontSize: 14, color: colors.ink, borderWidth: 1, borderColor: colors.line },
  ownerRow: { flexDirection: 'row', gap: 6, marginTop: 8, alignItems: 'center' },
  ownerChip: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: radius.chip, backgroundColor: colors.bg },
  ownerText: { fontSize: 12, fontWeight: weight.bold as '700', color: colors.sub },
  addBtn: { marginLeft: 'auto', backgroundColor: colors.ink, paddingHorizontal: 16, paddingVertical: 8, borderRadius: radius.button },
  addBtnText: { color: '#fff', fontWeight: weight.bold as '700', fontSize: 13 },
  noEvt: { fontSize: 13, color: colors.sub2, paddingVertical: 14, textAlign: 'center' },
  ev: { flexDirection: 'row', gap: 12, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.line, alignItems: 'center' },
  evBar: { width: 4, height: 36, borderRadius: 4 },
  evt2: { fontSize: 14.5, fontWeight: weight.bold as '700', color: colors.ink },
  evm: { fontSize: 12, color: colors.sub, marginTop: 3 },
  del: { fontSize: 12, color: colors.sub2, fontWeight: weight.semibold as '600' },
});
