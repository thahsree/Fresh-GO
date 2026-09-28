import { colors } from "@fresh-food/design-tokens";
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Image,
  Platform,
  StyleSheet,
  Text,
  View,
} from "react-native";

type SplashScreenProps = {
  onFinish?: () => void;
  duration?: number;
};

export function SplashScreen({
  onFinish,
  duration = 1800,
}: SplashScreenProps) {
  const [isVisible, setIsVisible] = useState(true);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.92)).current;
  const containerFadeAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const useNative = Platform.OS !== "web";

    // Animate logo entrance: fade in & slight scale up
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: useNative,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 6,
        tension: 40,
        useNativeDriver: useNative,
      }),
    ]).start();

    // Timer to fade out and unmount
    const timer = setTimeout(() => {
      Animated.timing(containerFadeAnim, {
        toValue: 0,
        duration: 400,
        useNativeDriver: useNative,
      }).start(() => {
        setIsVisible(false);
        onFinish?.();
      });
    }, duration);

    return () => clearTimeout(timer);
  }, [duration, fadeAnim, scaleAnim, containerFadeAnim, onFinish]);

  if (!isVisible) return null;

  return (
    <Animated.View
      style={[
        styles.container,
        {
          opacity: containerFadeAnim,
        },
      ]}
    >
      <Animated.View
        style={[
          styles.content,
          {
            opacity: fadeAnim,
            transform: [{ scale: scaleAnim }],
          },
        ]}
      >
        <Image
          source={require("../assets/FreshGologonew.png")}
          style={styles.logo}
          resizeMode="contain"
        />

        <View style={styles.taglineWrapper}>
          <Text style={styles.tagline}>
            Fresh Catch & Farm Direct Meats
          </Text>
          <Text style={styles.subtext}>Delivered to your doorstep</Text>
        </View>

        <ActivityIndicator
          size="small"
          color={colors.primary}
          style={styles.loader}
        />
      </Animated.View>

      <View style={styles.footer}>
        <Text style={styles.footerText}>100% Fresh · Chemical Free</Text>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFill,
    backgroundColor: "#FFFFFF",
    zIndex: 9999,
    justifyContent: "center",
    alignItems: "center",
  },
  content: {
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 30,
  },
  logo: {
    width: 280,
    height: 140,
    marginBottom: 16,
  },
  taglineWrapper: {
    alignItems: "center",
    gap: 4,
  },
  tagline: {
    color: colors.primaryDark,
    fontSize: 14,
    fontWeight: "700",
    letterSpacing: 0.3,
  },
  subtext: {
    color: colors.textSoft,
    fontSize: 12,
  },
  loader: {
    marginTop: 28,
  },
  footer: {
    position: "absolute",
    bottom: 36,
    alignItems: "center",
  },
  footerText: {
    color: colors.textSoft,
    fontSize: 11,
    fontWeight: "600",
    letterSpacing: 0.5,
  },
});
