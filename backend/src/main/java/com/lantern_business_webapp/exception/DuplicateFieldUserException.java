package com.lantern_business_webapp.exception;

import java.io.Serial;

public class DuplicateFieldUserException extends Exception {
    @Serial
    private static final long serialVersionUID = 1L;

    public DuplicateFieldUserException(String message) {
        super(message);
    }
}
