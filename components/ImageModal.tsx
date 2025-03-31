import React from 'react';
import { Modal, StyleSheet, TouchableOpacity, View, Image, Dimensions } from 'react-native';
import { IconButton } from 'react-native-paper';

type ImageModalProps = {
  visible: boolean;
  imageUrl: string;
  onClose: () => void;
};

export default function ImageModal({ visible, imageUrl, onClose }: ImageModalProps) {
  return (
    <Modal
      visible={visible}
      transparent={true}
      onRequestClose={onClose}
      animationType="fade"
    >
      <View style={styles.modalContainer}>
        <TouchableOpacity 
          style={styles.closeButton}
          onPress={onClose}
        >
          <IconButton 
            icon="close" 
            size={24} 
            iconColor="white"
            style={styles.closeIcon}
          />
        </TouchableOpacity>
        <Image
          source={{ uri: imageUrl }}
          style={styles.image}
          resizeMode="contain"
        />
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  image: {
    width: Dimensions.get('window').width,
    height: Dimensions.get('window').height,
  },
  closeButton: {
    position: 'absolute',
    top: 40,
    right: 20,
    zIndex: 1,
  },
  closeIcon: {
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 20,
  },
}); 