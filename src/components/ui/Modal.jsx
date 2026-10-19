
// Shared structure for dialogs and court portals.
export function ModalFrame({
  id,
  open,
  onClose,
  variant = "skill",
  className = `${variant}-modal`,
  closeOnRoot = false,
  backdrop = true,
  backdropProps = {},
  contentProps = {},
  children,
  ...props
}) {
  return (
    <div
      {...props}
      id={id}
      className={className + (open ? "" : " hidden")}
      role="dialog"
      aria-modal="true"
      onClick={
        closeOnRoot
          ? (event) => {
              if (event.target === event.currentTarget) onClose?.();
            }
          : props.onClick
      }
    >
      {backdrop && (
        <div
          className={`${variant}-modal__backdrop`}
          {...backdropProps}
          onClick={onClose}
        />
      )}
      <div className={`${variant}-modal__content`} {...contentProps}>
        {children}
      </div>
    </div>
  );
}
export function ModalHeader({
  title,
  titleId,
  variant = "skill",
  titleAs: Title = variant === "skill" ? "div" : "h3",
  titleClassName = variant === "skill" ? "skill-modal__title" : undefined,
  closeId,
  onClose,
  closeProps = {},
  children,
}) {
  return (
    <div className={`${variant}-modal__head`}>
      {title === undefined ? (
        children
      ) : (
        <>
          <Title id={titleId} className={titleClassName}>
            {title}
          </Title>
          {children}
          <ModalCloseButton
            variant={variant}
            id={closeId}
            {...closeProps}
            onClick={onClose}
          />
        </>
      )}
    </div>
  );
}
export function ModalBody({
  variant = "skill",
  className = `${variant}-modal__body`,
  children,
  ...props
}) {
  return (
    <div {...props} className={className}>
      {children}
    </div>
  );
}

export function ModalCloseButton({
  variant = "skill",
  children = "✕",
  ...props
}) {
  return (
    <button
      className={
        variant === "skill"
          ? "pill-remove skill-modal__close-abs"
          : "pill-remove"
      }
      aria-label="Chiudi"
      type="button"
      {...props}
    >
      {children}
    </button>
  );
}

// Common dialog chrome; feature components supply their title and body content.
export function ModalDialog({ title, closeProps = {}, bodyProps = {},
  variant = 'skill', onClose, children, footer, ...props }) {
  return (
    <ModalFrame {...props} variant={variant} onClose={onClose}>
      <ModalHeader variant={variant}>
        {title}
        <ModalCloseButton variant={variant} onClick={onClose} {...closeProps} />
      </ModalHeader>
      <ModalBody variant={variant} {...bodyProps}>{children}</ModalBody>
      {footer}
    </ModalFrame>
  );
}
