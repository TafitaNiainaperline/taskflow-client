import '../styles/badge.scss'

function Badge({ children, variant = 'primary', ...props }) {
  return (
    <span className={`badge badge-${variant}`} {...props}>
      {children}
    </span>
  )
}

export default Badge
