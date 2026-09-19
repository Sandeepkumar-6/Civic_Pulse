import { Children, type ElementType, type ReactNode } from 'react'
import { motion, useReducedMotion, type Variants } from 'motion/react'

type AnimatedGroupProps = {
  children: ReactNode
  className?: string
  as?: ElementType
  stagger?: number
}

export function AnimatedGroup({ children, className, as = 'div', stagger = 0.055 }: AnimatedGroupProps) {
  const reduceMotion = useReducedMotion()
  const MotionContainer = motion.create(as)
  const container: Variants = { hidden: {}, visible: { transition: { staggerChildren: reduceMotion ? 0 : stagger } } }
  const item: Variants = {
    hidden: reduceMotion ? { opacity: 1 } : { opacity: 0, y: 14 },
    visible: { opacity: 1, y: 0, transition: { duration: reduceMotion ? 0 : 0.38, ease: [0.22, 1, 0.36, 1] } },
  }

  return (
    <MotionContainer initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.16 }} variants={container} className={className}>
      {Children.map(children, (child, index) => <motion.div key={index} variants={item}>{child}</motion.div>)}
    </MotionContainer>
  )
}
