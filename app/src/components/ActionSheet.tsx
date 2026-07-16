/** 웹/네이티브 겸용 하단 액션 시트 (RN Modal — react-native-web 지원). */
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, weight } from '@/theme';

export type SheetAction = {
  label: string;
  destructive?: boolean;
  onPress: () => void;
};

export function ActionSheet({
  visible,
  actions,
  onClose,
}: {
  visible: boolean;
  actions: SheetAction[];
  onClose: () => void;
}) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
          {actions.map((a, i) => (
            <Pressable
              key={i}
              style={[styles.item, i > 0 && styles.itemBorder]}
              onPress={() => {
                onClose();
                a.onPress();
              }}>
              <Text style={[styles.itemText, a.destructive && { color: colors.rose }]}>{a.label}</Text>
            </Pressable>
          ))}
          <Pressable style={[styles.item, styles.cancel]} onPress={onClose}>
            <Text style={[styles.itemText, { color: colors.sub }]}>취소</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  sheet: {
    width: '100%',
    maxWidth: 480,
    backgroundColor: colors.bg,
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    paddingBottom: 18,
    paddingTop: 6,
  },
  item: { paddingVertical: 15, alignItems: 'center' },
  itemBorder: { borderTopWidth: 1, borderTopColor: colors.line },
  itemText: { fontSize: 15.5, fontWeight: weight.semibold as '600', color: colors.ink },
  cancel: { marginTop: 6, borderTopWidth: 1, borderTopColor: colors.line },
});
